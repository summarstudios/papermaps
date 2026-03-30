import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { slugify } from '../../utils/slugify.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SuggestPOIInput {
  citySlug: string;
  name: string;
  latitude: number;
  longitude: number;
  categorySlug?: string;
  whyYouLoveIt: string;
  suggestedByName?: string;
  suggestedByEmail?: string;
}

interface SuggestionResult {
  id: string;
  name: string;
  status: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 100 meters in approximate degrees at the equator
// 1 degree of latitude ~ 111,000 meters
const DUPLICATE_RADIUS_DEGREES = 100 / 111_000;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const suggestionsService = {
  async suggestPOI(
    input: SuggestPOIInput,
  ): Promise<
    | { data: SuggestionResult }
    | { error: 'CITY_NOT_FOUND' }
    | { error: 'CITY_NOT_PUBLISHED' }
    | { error: 'CATEGORY_NOT_FOUND' }
    | { error: 'DUPLICATE_POI'; existingName: string }
  > {
    // 1. Validate city exists and is PUBLISHED
    const city = await prisma.city.findUnique({
      where: { slug: input.citySlug },
      select: { id: true, status: true, name: true },
    });

    if (!city) {
      return { error: 'CITY_NOT_FOUND' };
    }

    if (city.status !== 'PUBLISHED') {
      return { error: 'CITY_NOT_PUBLISHED' };
    }

    // 2. Resolve category (optional)
    let categoryId: string | undefined;

    if (input.categorySlug) {
      // Try city-specific category first, then global
      const category = await prisma.category.findFirst({
        where: {
          slug: input.categorySlug,
          OR: [{ cityId: city.id }, { isGlobal: true }],
        },
        select: { id: true },
      });

      if (!category) {
        return { error: 'CATEGORY_NOT_FOUND' };
      }

      categoryId = category.id;
    }

    // If no category provided, use a default "uncategorized" or the first global category
    if (!categoryId) {
      const defaultCategory = await prisma.category.findFirst({
        where: { isGlobal: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      });

      if (defaultCategory) {
        categoryId = defaultCategory.id;
      }
    }

    // Category is required by the POI model — bail if we still don't have one
    if (!categoryId) {
      return { error: 'CATEGORY_NOT_FOUND' };
    }

    // 3. Check for duplicates (same name within ~100m radius)
    const duplicate = await prisma.pOI.findFirst({
      where: {
        cityId: city.id,
        name: { equals: input.name, mode: 'insensitive' },
        latitude: {
          gte: input.latitude - DUPLICATE_RADIUS_DEGREES,
          lte: input.latitude + DUPLICATE_RADIUS_DEGREES,
        },
        longitude: {
          gte: input.longitude - DUPLICATE_RADIUS_DEGREES,
          lte: input.longitude + DUPLICATE_RADIUS_DEGREES,
        },
      },
      select: { name: true },
    });

    if (duplicate) {
      return { error: 'DUPLICATE_POI', existingName: duplicate.name };
    }

    // 4. Generate unique slug
    const baseSlug = slugify(input.name);
    let slug = baseSlug;
    let counter = 1;
    while (
      await prisma.pOI.findUnique({
        where: { cityId_slug: { cityId: city.id, slug } },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 5. Build suggester metadata for warningNote (text field, visible in admin review)
    const suggesterMeta: Record<string, string> = {};
    if (input.suggestedByName) {
      suggesterMeta.suggestedByName = input.suggestedByName;
    }
    if (input.suggestedByEmail) {
      suggesterMeta.suggestedByEmail = input.suggestedByEmail;
    }
    const metadataNote =
      Object.keys(suggesterMeta).length > 0
        ? `[COMMUNITY SUGGESTION] ${JSON.stringify(suggesterMeta)}`
        : '[COMMUNITY SUGGESTION]';

    // 6. Create POI with AI_SUGGESTED status
    const createData: Prisma.POIUncheckedCreateInput = {
      cityId: city.id,
      slug,
      name: input.name,
      categoryId,
      latitude: input.latitude,
      longitude: input.longitude,
      localTip: input.whyYouLoveIt,
      warningNote: metadataNote,
      status: 'AI_SUGGESTED',
      priority: 'HIDDEN_GEM',
      aiSuggestedAt: new Date(),
    };

    const poi = await prisma.pOI.create({
      data: createData,
      select: { id: true, name: true, status: true },
    });

    return {
      data: {
        id: poi.id,
        name: poi.name,
        status: poi.status,
        message:
          'Thanks! Your suggestion will be reviewed by our local curator.',
      },
    };
  },
};
