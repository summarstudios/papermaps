import { prisma } from '../../lib/prisma.js';
import { discoveryService } from './discovery.service.js';
import { placesService } from '../places/places.service.js';
import { slugify } from '../../utils/slugify.js';

interface RunDiscoveryOptions {
  categorySlug?: string;
  searchQuery?: string;
}

export async function runDiscoveryJob(
  jobId: string,
  cityId: string,
  options: RunDiscoveryOptions,
): Promise<void> {
  try {
    // 1. Mark job as RUNNING
    await discoveryService.updateJobStatus(jobId, 'RUNNING');

    // 2. Fetch city to get bounds and name
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: {
        id: true,
        name: true,
        centerLat: true,
        centerLng: true,
        boundsNorthLat: true,
        boundsSouthLat: true,
        boundsEastLng: true,
        boundsWestLng: true,
      },
    });

    if (!city) {
      await discoveryService.updateJobStatus(jobId, 'FAILED', `City ${cityId} not found`);
      return;
    }

    // 3. Build search query
    let query: string;
    if (options.searchQuery) {
      query = options.searchQuery;
    } else if (options.categorySlug) {
      query = `${options.categorySlug} in ${city.name}`;
    } else {
      query = `points of interest in ${city.name}`;
    }

    // 4. Build bounds — use city bounds or fallback to center +/- 0.05 degrees
    const bounds =
      city.boundsNorthLat != null &&
      city.boundsSouthLat != null &&
      city.boundsEastLng != null &&
      city.boundsWestLng != null
        ? {
            northLat: city.boundsNorthLat,
            southLat: city.boundsSouthLat,
            eastLng: city.boundsEastLng,
            westLng: city.boundsWestLng,
          }
        : {
            northLat: city.centerLat + 0.05,
            southLat: city.centerLat - 0.05,
            eastLng: city.centerLng + 0.05,
            westLng: city.centerLng - 0.05,
          };

    // 5. Search places via Google Places API
    const { results, isMock } = await placesService.searchPlaces(query, bounds);

    if (isMock) {
      console.warn(
        `[discovery-runner] Job ${jobId}: mock data returned — configure GOOGLE_PLACES_API_KEY`,
      );
      await discoveryService.updateJobStatus(
        jobId,
        'FAILED',
        'Cannot run discovery with mock data — configure GOOGLE_PLACES_API_KEY',
      );
      return;
    }

    // 6. Resolve category for new POIs
    const categoryId = await resolveCategory(cityId, options.categorySlug);

    // 7. Process each place result
    for (const place of results) {
      // Check for existing POI with this googlePlaceId
      const existing = await prisma.pOI.findUnique({
        where: { googlePlaceId: place.placeId },
        select: { id: true },
      });

      if (existing) {
        await discoveryService.updateJobCounts(jobId, { duplicatesSkipped: 1 });
        continue;
      }

      // Generate a unique slug for this POI within the city
      const baseSlug = slugify(place.name);
      const slug = await generateUniqueSlug(cityId, baseSlug);

      try {
        await prisma.pOI.create({
          data: {
            cityId,
            name: place.name,
            slug,
            latitude: place.latitude,
            longitude: place.longitude,
            googlePlaceId: place.placeId,
            categoryId,
            status: 'AI_SUGGESTED',
            aiSuggestedAt: new Date(),
            shortDescription: place.editorialSummary ?? undefined,
            address: place.address ?? undefined,
            phone: place.phone ?? undefined,
            website: place.website ?? undefined,
          },
        });

        await discoveryService.updateJobCounts(jobId, { candidatesFound: 1 });
      } catch (err: any) {
        // Handle unique constraint violation on googlePlaceId (race condition)
        if (err.code === 'P2002') {
          await discoveryService.updateJobCounts(jobId, { duplicatesSkipped: 1 });
        } else {
          throw err;
        }
      }
    }

    // 8. Mark job as COMPLETED
    await discoveryService.updateJobStatus(jobId, 'COMPLETED');
  } catch (err: any) {
    console.error(`[discovery-runner] Job ${jobId} failed:`, err);
    await discoveryService.updateJobStatus(
      jobId,
      'FAILED',
      err.message || 'Unknown error',
    );
  }
}

/**
 * Resolve the category ID to use for new POIs.
 *
 * If a categorySlug is provided, look it up (city-specific first, then global).
 * Otherwise fall back to the first global category.
 */
async function resolveCategory(cityId: string, categorySlug?: string): Promise<string> {
  if (categorySlug) {
    // Try city-specific category first, then global
    const category = await prisma.category.findFirst({
      where: {
        slug: categorySlug,
        OR: [{ cityId }, { isGlobal: true }],
      },
      orderBy: { isGlobal: 'asc' }, // city-specific first
      select: { id: true },
    });

    if (category) {
      return category.id;
    }
  }

  // Fall back to first global category
  const globalCategory = await prisma.category.findFirst({
    where: { isGlobal: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });

  if (globalCategory) {
    return globalCategory.id;
  }

  // Last resort: any category for this city
  const anyCategory = await prisma.category.findFirst({
    where: { cityId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });

  if (anyCategory) {
    return anyCategory.id;
  }

  throw new Error(`No category found for city ${cityId} — create at least one category first`);
}

/**
 * Generate a unique slug for a POI within a city.
 * Appends a numeric suffix if the base slug is already taken.
 */
async function generateUniqueSlug(cityId: string, baseSlug: string): Promise<string> {
  const existing = await prisma.pOI.findUnique({
    where: { cityId_slug: { cityId, slug: baseSlug } },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  // Try suffixed slugs
  for (let i = 2; i <= 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    const taken = await prisma.pOI.findUnique({
      where: { cityId_slug: { cityId, slug: candidate } },
      select: { id: true },
    });
    if (!taken) {
      return candidate;
    }
  }

  // Extremely unlikely fallback
  return `${baseSlug}-${Date.now()}`;
}
