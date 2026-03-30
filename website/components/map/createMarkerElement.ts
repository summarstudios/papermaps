/**
 * Creates an HTML element containing a hand-drawn SVG map marker,
 * suitable for use with MapLibre GL's `new maplibregl.Marker({ element })`.
 *
 * Usage:
 *   import maplibregl from "maplibre-gl";
 *   import { createMarkerElement } from "@/components/map/createMarkerElement";
 *
 *   const el = createMarkerElement("temple", { priority: "MUST_VISIT" });
 *   new maplibregl.Marker({ element: el, anchor: "bottom" })
 *     .setLngLat([76.65, 12.30])
 *     .addTo(map);
 */

import { getCategoryIcon, type PrimaryCategorySlug } from "./marker-icons";

// ---------------------------------------------------------------------------
// Brand tokens
// ---------------------------------------------------------------------------

const INK_BLACK = "#2D2926";
const PAPER_CREAM = "#FDF6EC";

// ---------------------------------------------------------------------------
// Category → color mapping (earthy, illustrated-map palette)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  food: "#C4663A",       // terra cotta
  restaurant: "#C4663A",
  dining: "#C4663A",
  coffee: "#4A7FB5",     // ocean blue
  cafe: "#4A7FB5",
  temple: "#E8B84B",     // sunset gold
  shrine: "#E8B84B",
  worship: "#E8B84B",
  park: "#5B8C5A",       // forest green
  garden: "#5B8C5A",
  nature: "#5B8C5A",
  market: "#C4663A",     // terra cotta
  bazaar: "#C4663A",
  hotel: "#3D5A99",      // deep indigo
  lodging: "#3D5A99",
  stay: "#3D5A99",
  accommodation: "#3D5A99",
  viewpoint: "#C75B7A",  // dusty rose
  scenic: "#C75B7A",
  lookout: "#C75B7A",
  culture: "#E8B84B",    // sunset gold
  arts: "#E8B84B",
  museum: "#E8B84B",
  theater: "#E8B84B",
  theatre: "#E8B84B",
  shopping: "#C4663A",   // terra cotta
  retail: "#C4663A",
  shop: "#C4663A",
  transport: "#6B6560",  // pencil gray
  transit: "#6B6560",
  bus: "#6B6560",
  auto: "#6B6560",
  default: "#2D2926",    // ink black
};

/**
 * Resolve the display color for a category slug.
 * Falls back to ink black for unknown categories.
 */
export function getCategoryColor(slug: string): string {
  return CATEGORY_COLORS[slug.toLowerCase().trim()] ?? CATEGORY_COLORS["default"];
}

// ---------------------------------------------------------------------------
// SVG path constants (duplicated from HandDrawnMarker to avoid React dep)
// ---------------------------------------------------------------------------

const PIN_OUTLINE =
  "M20.0 2.5 " +
  "C12.2 2.3 5.5 7.8 5.2 16.0 " +
  "C4.8 20.5 7.0 25.2 10.5 30.0 " +
  "C13.8 34.5 17.5 39.2 19.2 44.8 " +
  "C19.5 45.8 20.2 46.0 20.5 45.8 " +
  "C20.8 46.0 21.2 45.5 21.5 44.5 " +
  "C23.0 39.0 26.5 34.2 29.8 29.8 " +
  "C33.2 25.0 35.5 20.2 35.0 15.8 " +
  "C34.5 7.5 27.8 2.7 20.0 2.5Z";

const PIN_HIGHLIGHT =
  "M20.0 5.5 " +
  "C14.0 5.3 8.5 9.5 8.2 15.8 " +
  "C7.9 19.2 9.5 22.8 12.5 27.0 " +
  "C15.0 30.5 17.8 34.5 19.5 39.0 " +
  "C19.8 39.8 20.2 39.8 20.5 39.0 " +
  "C22.2 34.5 25.0 30.5 27.5 27.0 " +
  "C30.5 22.8 32.2 19.2 31.8 15.8 " +
  "C31.5 9.5 26.0 5.3 20.0 5.5Z";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CreateMarkerOptions {
  /** Override the default color for the category */
  color?: string;
  /** POI priority level — "MUST_VISIT" gets the larger 44px size */
  priority?: "MUST_VISIT" | "RECOMMENDED" | "HIDDEN_GEM" | string;
  /** Explicit size override in pixels (height). Defaults based on priority. */
  size?: number;
  /** Additional CSS class names on the wrapper element */
  className?: string;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build an HTML element containing a hand-drawn SVG pin marker.
 *
 * This is a pure DOM function (no React) so it works directly with
 * MapLibre's `Marker({ element })` constructor.
 *
 * @param categorySlug - The POI category (e.g. "food", "temple", "default")
 * @param options - Color, size, and priority overrides
 * @returns HTMLDivElement ready to pass to `new maplibregl.Marker({ element })`
 */
export function createMarkerElement(
  categorySlug: string = "default",
  options: CreateMarkerOptions = {},
): HTMLDivElement {
  const slug = categorySlug.toLowerCase().trim();
  const color = options.color ?? getCategoryColor(slug);
  const isMustVisit = options.priority === "MUST_VISIT";
  const size = options.size ?? (isMustVisit ? 44 : 36);

  const icon = getCategoryIcon(slug);

  // Dimensions
  const aspectRatio = 40 / 52;
  const width = Math.round(size * aspectRatio);

  // Icon transform values (same logic as HandDrawnMarker.tsx)
  const iconScale = 0.6;
  const iconOffsetX = 20 - 12 * iconScale;
  const iconOffsetY = 14 - 12 * iconScale;

  // Build icon path elements
  const strokePaths = icon.paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${PAPER_CREAM}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");

  const fillPaths = (icon.fills ?? [])
    .map(
      (d) =>
        `<path d="${d}" fill="${PAPER_CREAM}" stroke="none"/>`,
    )
    .join("");

  // Unique ID for the filter (avoid collisions with multiple markers)
  const filterId = `pm-shadow-${slug}-${Math.random().toString(36).slice(2, 8)}`;

  const svg = `
<svg
  width="${width}"
  height="${size}"
  viewBox="0 0 40 52"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="${slug} marker"
>
  <defs>
    <filter id="${filterId}" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#2D2926" flood-opacity="0.18"/>
    </filter>
  </defs>
  <path
    d="${PIN_OUTLINE}"
    fill="${color}"
    stroke="${INK_BLACK}"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#${filterId})"
  />
  <path
    d="${PIN_HIGHLIGHT}"
    fill="none"
    stroke="${PAPER_CREAM}"
    stroke-width="0.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.25"
  />
  <g transform="translate(${iconOffsetX}, ${iconOffsetY}) scale(${iconScale})">
    ${strokePaths}
    ${fillPaths}
  </g>
</svg>`.trim();

  // Wrap in a positioned container so MapLibre's anchor: "bottom" works correctly
  const wrapper = document.createElement("div");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.cursor = "pointer";
  wrapper.style.transition = "transform 0.15s ease";

  if (options.className) {
    wrapper.className = options.className;
  }

  wrapper.innerHTML = svg;

  // Hover micro-interaction: gentle lift
  wrapper.addEventListener("mouseenter", () => {
    wrapper.style.transform = "translateY(-2px) scale(1.08)";
  });
  wrapper.addEventListener("mouseleave", () => {
    wrapper.style.transform = "translateY(0) scale(1)";
  });

  return wrapper;
}

// ---------------------------------------------------------------------------
// Convenience: list of primary categories with their colors
// ---------------------------------------------------------------------------

export interface CategoryColorEntry {
  slug: PrimaryCategorySlug;
  color: string;
  label: string;
}

export const CATEGORY_COLOR_LIST: CategoryColorEntry[] = [
  { slug: "food", color: "#C4663A", label: "Food & Dining" },
  { slug: "coffee", color: "#4A7FB5", label: "Coffee & Cafes" },
  { slug: "temple", color: "#E8B84B", label: "Temples & Shrines" },
  { slug: "park", color: "#5B8C5A", label: "Parks & Nature" },
  { slug: "market", color: "#C4663A", label: "Markets & Bazaars" },
  { slug: "hotel", color: "#3D5A99", label: "Hotels & Stays" },
  { slug: "viewpoint", color: "#C75B7A", label: "Viewpoints & Scenic" },
  { slug: "culture", color: "#E8B84B", label: "Culture & Arts" },
  { slug: "shopping", color: "#C4663A", label: "Shopping & Retail" },
  { slug: "transport", color: "#6B6560", label: "Transport" },
  { slug: "default", color: "#2D2926", label: "Other" },
];
