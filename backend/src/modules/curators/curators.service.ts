import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateCuratorProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  baseCity?: string;
  curatorSince?: string; // ISO date string
  isPublicCurator?: boolean;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}

// ---------------------------------------------------------------------------
// Safe select — never expose sensitive fields (email, password, clerkId, etc.)
// ---------------------------------------------------------------------------

const publicCuratorSelect = {
  id: true,
  displayName: true,
  name: true,
  bio: true,
  avatarUrl: true,
  imageUrl: true,
  baseCity: true,
  curatorSince: true,
  isPublicCurator: true,
  socialLinks: true,
} satisfies Prisma.UserSelect;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const curatorsService = {
  /**
   * Get a single curator's public profile by user ID.
   * Returns null if the user doesn't exist or isn't a public curator.
   */
  async getCuratorProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isPublicCurator: true },
      select: {
        ...publicCuratorSelect,
        curatedCities: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            heroImageUrl: true,
            country: true,
            state: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!user) return null;

    // Count POIs curated by this user
    const poiCount = await prisma.pOI.count({
      where: { curatedById: userId, status: 'PUBLISHED' },
    });

    return { ...user, poiCount };
  },

  /**
   * Get the curator assigned to a specific city (by slug).
   * Returns null if the city has no curator or the curator is not public.
   */
  async getCuratorByCitySlug(citySlug: string) {
    const city = await prisma.city.findUnique({
      where: { slug: citySlug },
      select: {
        id: true,
        curatorId: true,
        curator: {
          select: publicCuratorSelect,
        },
      },
    });

    if (!city || !city.curator || !city.curator.isPublicCurator) {
      return null;
    }

    // Count POIs this curator has curated in this specific city
    const poiCount = await prisma.pOI.count({
      where: {
        curatedById: city.curatorId!,
        cityId: city.id,
        status: 'PUBLISHED',
      },
    });

    return { ...city.curator, poiCount };
  },

  /**
   * List all public curators with their city count and POI count.
   */
  async listPublicCurators() {
    const curators = await prisma.user.findMany({
      where: { isPublicCurator: true },
      select: {
        ...publicCuratorSelect,
        _count: {
          select: {
            curatedCities: { where: { status: 'PUBLISHED' } },
            curatedPOIs: { where: { status: 'PUBLISHED' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return curators.map((curator) => ({
      id: curator.id,
      displayName: curator.displayName,
      name: curator.name,
      bio: curator.bio,
      avatarUrl: curator.avatarUrl,
      imageUrl: curator.imageUrl,
      baseCity: curator.baseCity,
      curatorSince: curator.curatorSince,
      isPublicCurator: curator.isPublicCurator,
      socialLinks: curator.socialLinks,
      cityCount: curator._count.curatedCities,
      poiCount: curator._count.curatedPOIs,
    }));
  },

  /**
   * Update a curator's public profile (admin only).
   */
  async updateCuratorProfile(userId: string, data: UpdateCuratorProfileData) {
    // Verify user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) return null;

    const updateData: Prisma.UserUncheckedUpdateInput = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.baseCity !== undefined) updateData.baseCity = data.baseCity;
    if (data.curatorSince !== undefined) updateData.curatorSince = new Date(data.curatorSince);
    if (data.isPublicCurator !== undefined) updateData.isPublicCurator = data.isPublicCurator;
    if (data.socialLinks !== undefined) updateData.socialLinks = data.socialLinks as Prisma.InputJsonValue;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: publicCuratorSelect,
    });

    return updated;
  },
};
