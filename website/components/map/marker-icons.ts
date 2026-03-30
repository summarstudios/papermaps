/**
 * Hand-drawn SVG icon path data for POI category markers.
 *
 * All paths are designed for a 24x24 viewBox and use stroke-based rendering
 * with slightly irregular cubic beziers to achieve a sketched, fountain-pen
 * aesthetic that matches the Paper Maps brand.
 *
 * Usage:
 *   const paths = getCategoryIcon("food");
 *   // Render each path string inside an <svg viewBox="0 0 24 24">
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkerIconData {
  /** One or more SVG path `d` strings to render with stroke */
  paths: string[];
  /** Optional extra filled paths (e.g. small dots/accents) */
  fills?: string[];
}

// ---------------------------------------------------------------------------
// Icon library — each crafted with hand-drawn wobble
// ---------------------------------------------------------------------------

/** Fork and knife, sketchy style */
const foodIcon: MarkerIconData = {
  paths: [
    // Fork — four tines with slightly uneven spacing
    "M7.2 5.1 C7.1 5.0 7.3 7.8 7.2 9.5 C7.1 10.3 7.8 10.8 8.1 10.5 C8.3 10.2 8.2 7.9 8.2 5.2",
    "M9.2 5.0 C9.3 5.1 9.1 7.7 9.2 9.4 C9.3 10.4 8.5 10.9 8.2 10.6",
    // Fork handle
    "M8.2 10.5 C8.1 11.2 8.3 14.8 8.2 18.6",
    // Knife blade
    "M15.8 5.2 C15.7 5.1 16.2 8.3 16.0 10.2 C15.8 11.8 14.5 11.6 14.6 10.1 C14.7 8.5 15.0 5.3 15.8 5.2",
    // Knife handle
    "M15.3 10.8 C15.4 11.5 15.2 15.1 15.3 18.5",
  ],
};

/** Coffee cup with steam wisps */
const coffeeIcon: MarkerIconData = {
  paths: [
    // Cup body — slightly wonky rectangle
    "M6.5 10.2 C6.4 10.1 6.6 16.8 6.8 17.5 C7.0 18.2 7.5 18.6 8.2 18.7 L15.6 18.8 C16.4 18.7 16.9 18.1 17.0 17.4 C17.2 16.7 17.1 10.3 17.0 10.1",
    // Cup rim
    "M6.2 10.2 L17.3 10.1",
    // Handle — ear shape on right side
    "M17.0 11.8 C18.2 11.6 19.1 12.5 19.0 13.8 C18.9 15.1 18.0 15.9 17.1 15.7",
    // Steam wisps — three wavy lines
    "M9.5 5.0 C9.2 6.2 10.0 6.8 9.6 8.0",
    "M11.8 4.5 C11.5 5.8 12.3 6.5 11.9 7.8",
    "M14.0 5.2 C13.7 6.3 14.5 7.0 14.1 8.1",
  ],
};

/** Temple/shrine with peaked roof and pillars */
const templeIcon: MarkerIconData = {
  paths: [
    // Peaked roof — hand-drawn triangle
    "M5.5 10.5 C5.6 10.6 11.8 4.8 12.2 4.5 C12.5 4.7 18.3 10.4 18.5 10.6",
    // Roof eave — slight curve
    "M4.8 10.8 C4.9 10.7 11.9 10.5 19.2 10.7",
    // Left pillar
    "M7.8 10.8 C7.7 11.0 7.9 17.5 7.8 18.2",
    // Right pillar
    "M16.2 10.7 C16.3 11.0 16.1 17.4 16.2 18.3",
    // Base platform
    "M5.6 18.3 C5.7 18.2 12.0 18.4 18.4 18.3",
    // Inner doorway arch
    "M10.5 18.3 C10.4 15.8 10.8 14.2 12.0 13.8 C13.2 14.1 13.6 15.7 13.5 18.2",
  ],
};

/** Tree with organic canopy and trunk */
const parkIcon: MarkerIconData = {
  paths: [
    // Tree canopy — blobby, organic cloud shape
    "M8.0 11.5 C6.5 11.2 5.5 9.8 6.0 8.2 C6.4 6.8 7.8 6.0 8.5 6.2 C8.8 5.0 10.0 4.2 11.5 4.3 C12.2 4.0 13.4 4.1 14.2 4.8 C15.0 4.5 16.2 5.0 16.8 6.0 C17.8 6.3 18.5 7.5 18.2 8.8 C18.6 9.8 17.8 11.2 16.5 11.4 C15.5 12.0 13.8 12.2 12.2 11.8 C10.8 12.1 9.2 12.0 8.0 11.5Z",
    // Trunk — slightly bent
    "M11.5 11.6 C11.3 12.8 11.8 15.2 11.6 16.8 C11.5 17.5 12.0 18.8 12.2 18.9",
    // Root hints
    "M11.6 18.0 C10.8 18.5 10.2 18.8 9.8 18.7",
    "M12.2 18.2 C13.0 18.7 13.8 18.9 14.2 18.6",
  ],
};

/** Market stall with awning and counter */
const marketIcon: MarkerIconData = {
  paths: [
    // Awning — wavy scalloped top
    "M5.0 9.0 C5.8 7.2 7.0 6.5 8.2 7.8 C9.0 6.2 10.5 6.5 11.2 7.6 C12.0 6.3 13.5 6.2 14.5 7.5 C15.2 6.4 16.8 6.5 17.5 7.8 C18.5 7.0 19.2 8.0 19.0 9.1",
    // Awning bottom edge
    "M5.0 9.0 L19.0 9.1",
    // Left post
    "M6.5 9.0 C6.4 9.2 6.6 17.8 6.5 18.5",
    // Right post
    "M17.5 9.1 C17.6 9.3 17.4 17.7 17.5 18.4",
    // Counter shelf
    "M6.5 14.2 L17.5 14.3",
    // Base
    "M5.8 18.5 L18.2 18.4",
  ],
};

/** Building with door — hotel/lodging */
const hotelIcon: MarkerIconData = {
  paths: [
    // Building outline — slightly uneven rectangle
    "M6.0 6.8 C5.9 6.7 6.1 18.2 6.0 18.5 L18.0 18.4 C18.1 18.3 17.9 6.9 18.0 6.7 L6.0 6.8",
    // Roof line
    "M5.2 6.8 L18.8 6.7",
    // Door
    "M10.5 18.4 C10.4 15.8 10.6 13.5 10.5 13.2 L13.5 13.1 C13.6 13.3 13.4 15.9 13.5 18.3",
    // Window left
    "M7.5 8.8 L9.3 8.7 L9.3 10.8 L7.5 10.9 Z",
    // Window right
    "M14.7 8.8 L16.5 8.7 L16.5 10.8 L14.7 10.9 Z",
  ],
};

/** Eye/viewpoint — open eye with iris */
const viewpointIcon: MarkerIconData = {
  paths: [
    // Eye outline — almond shape with hand wobble
    "M4.5 12.0 C5.5 9.0 8.5 6.8 12.0 6.5 C15.5 6.8 18.5 9.0 19.5 12.0 C18.5 15.0 15.5 17.2 12.0 17.5 C8.5 17.2 5.5 15.0 4.5 12.0Z",
    // Iris circle — slightly imperfect
    "M9.5 12.0 C9.4 10.5 10.5 9.3 12.0 9.2 C13.5 9.3 14.6 10.5 14.5 12.0 C14.6 13.5 13.5 14.7 12.0 14.8 C10.5 14.7 9.4 13.5 9.5 12.0Z",
  ],
  fills: [
    // Pupil — small filled dot
    "M11.2 11.5 C11.1 11.0 11.5 10.6 12.0 10.5 C12.5 10.6 12.9 11.0 12.8 11.5 C12.9 12.0 12.5 12.4 12.0 12.5 C11.5 12.4 11.1 12.0 11.2 11.5Z",
  ],
};

/** Theater mask — culture/arts */
const cultureIcon: MarkerIconData = {
  paths: [
    // Mask outline — slightly asymmetric face shape
    "M7.0 7.5 C6.5 8.5 6.2 10.5 6.5 12.5 C6.8 14.5 8.0 16.5 10.0 17.8 C11.0 18.5 13.0 18.5 14.0 17.8 C16.0 16.5 17.2 14.5 17.5 12.5 C17.8 10.5 17.5 8.5 17.0 7.5 C15.5 5.5 13.0 4.8 12.0 4.8 C11.0 4.8 8.5 5.5 7.0 7.5Z",
    // Left eye — arched
    "M8.8 9.8 C9.2 9.0 10.2 8.8 10.8 9.5 C10.5 10.2 9.5 10.5 8.8 9.8",
    // Right eye — arched
    "M13.2 9.5 C13.8 8.8 14.8 9.0 15.2 9.8 C14.5 10.5 13.5 10.2 13.2 9.5",
    // Smile — gentle upward curve
    "M9.5 13.5 C10.5 15.2 13.5 15.2 14.5 13.5",
  ],
};

/** Shopping bag with handle */
const shoppingIcon: MarkerIconData = {
  paths: [
    // Bag body — slightly tapered
    "M6.8 9.5 C6.6 9.6 6.2 17.8 6.5 18.2 C6.8 18.6 16.8 18.7 17.2 18.3 C17.5 17.9 17.4 9.7 17.2 9.5 L6.8 9.5",
    // Handle — arch at top
    "M9.5 9.5 C9.4 7.8 9.8 6.0 12.0 5.8 C14.2 6.0 14.6 7.8 14.5 9.5",
  ],
};

/** Bus/auto-rickshaw — transport */
const transportIcon: MarkerIconData = {
  paths: [
    // Bus body — rounded rectangle
    "M4.8 9.5 C4.7 9.2 5.0 7.5 5.5 7.0 C6.0 6.5 17.5 6.4 18.2 7.0 C18.8 7.5 19.0 9.3 19.0 9.5 L19.2 14.5 C19.1 15.2 18.5 15.5 18.0 15.5 L6.0 15.6 C5.5 15.5 4.9 15.2 4.8 14.5 Z",
    // Windshield division
    "M4.8 11.0 L19.1 10.9",
    // Window dividers
    "M9.5 7.0 L9.5 10.9",
    "M14.5 7.0 L14.5 10.9",
    // Left wheel
    "M7.5 15.5 C6.5 15.4 5.8 16.2 5.8 17.0 C5.8 17.8 6.5 18.5 7.5 18.5 C8.5 18.5 9.2 17.8 9.2 17.0 C9.2 16.2 8.5 15.4 7.5 15.5",
    // Right wheel
    "M16.5 15.5 C15.5 15.4 14.8 16.2 14.8 17.0 C14.8 17.8 15.5 18.5 16.5 18.5 C17.5 18.5 18.2 17.8 18.2 17.0 C18.2 16.2 17.5 15.4 16.5 15.5",
  ],
};

/** Simple filled dot — default / fallback */
const defaultIcon: MarkerIconData = {
  paths: [
    // Circle outline — hand-drawn wobble
    "M8.0 12.0 C7.9 9.5 9.5 7.8 12.0 7.5 C14.5 7.8 16.1 9.5 16.0 12.0 C16.1 14.5 14.5 16.2 12.0 16.5 C9.5 16.2 7.9 14.5 8.0 12.0Z",
  ],
  fills: [
    // Inner filled dot
    "M10.5 12.0 C10.4 11.0 11.0 10.3 12.0 10.2 C13.0 10.3 13.6 11.0 13.5 12.0 C13.6 13.0 13.0 13.7 12.0 13.8 C11.0 13.7 10.4 13.0 10.5 12.0Z",
  ],
};

// ---------------------------------------------------------------------------
// Category → icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, MarkerIconData> = {
  food: foodIcon,
  restaurant: foodIcon,
  dining: foodIcon,
  coffee: coffeeIcon,
  cafe: coffeeIcon,
  temple: templeIcon,
  shrine: templeIcon,
  worship: templeIcon,
  park: parkIcon,
  garden: parkIcon,
  nature: parkIcon,
  market: marketIcon,
  bazaar: marketIcon,
  hotel: hotelIcon,
  lodging: hotelIcon,
  stay: hotelIcon,
  accommodation: hotelIcon,
  viewpoint: viewpointIcon,
  scenic: viewpointIcon,
  lookout: viewpointIcon,
  culture: cultureIcon,
  arts: cultureIcon,
  museum: cultureIcon,
  theater: cultureIcon,
  theatre: cultureIcon,
  shopping: shoppingIcon,
  retail: shoppingIcon,
  shop: shoppingIcon,
  transport: transportIcon,
  transit: transportIcon,
  bus: transportIcon,
  auto: transportIcon,
  default: defaultIcon,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up the hand-drawn icon data for a given category slug.
 * Falls back to `default` if the slug is not recognized.
 */
export function getCategoryIcon(slug: string): MarkerIconData {
  const normalized = slug.toLowerCase().trim();
  return ICON_MAP[normalized] ?? ICON_MAP["default"];
}

/**
 * Get the full list of explicitly supported category slugs
 * (excludes aliases).
 */
export const PRIMARY_CATEGORIES = [
  "food",
  "coffee",
  "temple",
  "park",
  "market",
  "hotel",
  "viewpoint",
  "culture",
  "shopping",
  "transport",
  "default",
] as const;

export type PrimaryCategorySlug = (typeof PRIMARY_CATEGORIES)[number];
