/**
 * Hand-drawn map style enhancements for Paper Maps.
 *
 * Instead of providing a full MapLibre style JSON (which would require hosting
 * custom vector tiles), this module enhances the existing positron base style
 * with hand-drawn aesthetics: warmer colors, thinner roads, softer labels,
 * and hidden overly-digital elements.
 *
 * The base style comes from OpenFreeMap's positron tiles and is then modified
 * in-place via MapLibre's paint/layout property APIs.
 */

import type maplibregl from "maplibre-gl";

// ---------------------------------------------------------------------------
// Brand tokens
// ---------------------------------------------------------------------------

export const HAND_DRAWN_PALETTE = {
  /** Warm cream background — like aged paper */
  paper: "#FDF6EC",
  /** Soft watercolor blue for water bodies */
  water: "#B8D4E3",
  /** Slightly deeper blue for rivers/streams */
  waterway: "#A4C5D8",
  /** Warm paper tone for land areas */
  land: "#F5E6D0",
  /** Soft watercolor green for parks */
  parkGreen: "#B8D4B8",
  /** Lighter green for general landcover */
  landcoverGreen: "#C8DABB",
  /** Warm tone for buildings */
  building: "#EDD9C0",
  /** Pencil gray for minor roads */
  roadMinor: "#A39E99",
  /** Slightly darker pencil for major roads */
  roadMajor: "#8E8880",
  /** Muted boundary lines */
  boundary: "#C8BCA0",
  /** Rail lines — very subtle */
  rail: "#B8B0A5",
  /** Serif-style label color for place names */
  labelMajor: "#5A5040",
  /** Muted label for minor features */
  labelMinor: "#8B8070",
} as const;

// ---------------------------------------------------------------------------
// Layers to completely hide for a cleaner, paper-map feel
// ---------------------------------------------------------------------------

const HIDE_PATTERNS = [
  "housenumber",
  "poi_",
  "aeroway",
  "aerodrome",
  "ferry",
  "highway_shield",
  "highway-shield",
  "transit",
  "building-3d",
  "building_3d",
  "building-top",
];

// ---------------------------------------------------------------------------
// Apply hand-drawn tinting to a loaded map style
// ---------------------------------------------------------------------------

/**
 * Transforms the loaded map style to feel hand-drawn and paper-like.
 *
 * This works by iterating over all layers in the style and adjusting their
 * paint/layout properties. It is called once after `style.load` and again
 * whenever the cultural palette changes.
 *
 * @param map - The MapLibre map instance (must have style loaded)
 * @param culturalOverrides - Optional overrides from the cultural theme system
 */
export function applyHandDrawnStyle(
  map: maplibregl.Map,
  culturalOverrides?: {
    land?: string;
    water?: string;
    park?: string;
    road?: string;
    building?: string;
    labelMajor?: string;
    labelMinor?: string;
  },
): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  const c = {
    ...HAND_DRAWN_PALETTE,
    ...(culturalOverrides?.land && { land: culturalOverrides.land }),
    ...(culturalOverrides?.water && { water: culturalOverrides.water }),
    ...(culturalOverrides?.park && { parkGreen: culturalOverrides.park }),
    ...(culturalOverrides?.road && { roadMinor: culturalOverrides.road }),
    ...(culturalOverrides?.building && { building: culturalOverrides.building }),
    ...(culturalOverrides?.labelMajor && {
      labelMajor: culturalOverrides.labelMajor,
    }),
    ...(culturalOverrides?.labelMinor && {
      labelMinor: culturalOverrides.labelMinor,
    }),
  };

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();

    try {
      // ----- Background -----
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", c.land);
        continue;
      }

      // ----- Water fills -----
      if (
        layer.type === "fill" &&
        id.includes("water") &&
        !id.includes("way")
      ) {
        map.setPaintProperty(layer.id, "fill-color", c.water);
        map.setPaintProperty(layer.id, "fill-opacity", 0.65);
        continue;
      }

      // ----- Waterways (rivers, streams) -----
      if (layer.type === "line" && id.includes("waterway")) {
        map.setPaintProperty(layer.id, "line-color", c.waterway);
        map.setPaintProperty(layer.id, "line-opacity", 0.5);
        continue;
      }

      // ----- Parks, green areas -----
      if (
        layer.type === "fill" &&
        (id.includes("park") || id.includes("green") || id.includes("forest"))
      ) {
        map.setPaintProperty(layer.id, "fill-color", c.parkGreen);
        map.setPaintProperty(layer.id, "fill-opacity", 0.45);
        continue;
      }

      // ----- Landcover (grass, wood, etc.) -----
      if (layer.type === "fill" && id.includes("landcover")) {
        map.setPaintProperty(layer.id, "fill-color", c.landcoverGreen);
        map.setPaintProperty(layer.id, "fill-opacity", 0.3);
        continue;
      }

      // ----- Landuse -----
      if (layer.type === "fill" && id.includes("landuse")) {
        map.setPaintProperty(layer.id, "fill-color", c.landcoverGreen);
        map.setPaintProperty(layer.id, "fill-opacity", 0.2);
        continue;
      }

      // ----- Buildings -----
      if (layer.type === "fill" && id.includes("building")) {
        map.setPaintProperty(layer.id, "fill-color", c.building);
        map.setPaintProperty(layer.id, "fill-opacity", 0.3);
        continue;
      }

      // ----- Roads: major (thinner, pencil-like) -----
      if (
        layer.type === "line" &&
        (id.includes("highway") ||
          id.includes("trunk") ||
          id.includes("primary") ||
          id.includes("motorway"))
      ) {
        map.setPaintProperty(layer.id, "line-color", c.roadMajor);
        map.setPaintProperty(layer.id, "line-opacity", 0.5);
        continue;
      }

      // ----- Roads: minor -----
      if (
        layer.type === "line" &&
        (id.includes("road") ||
          id.includes("secondary") ||
          id.includes("tertiary") ||
          id.includes("minor") ||
          id.includes("service") ||
          id.includes("path") ||
          id.includes("street") ||
          id.includes("transportation"))
      ) {
        map.setPaintProperty(layer.id, "line-color", c.roadMinor);
        map.setPaintProperty(layer.id, "line-opacity", 0.35);
        continue;
      }

      // ----- Railway -----
      if (layer.type === "line" && id.includes("rail")) {
        map.setPaintProperty(layer.id, "line-color", c.rail);
        map.setPaintProperty(layer.id, "line-opacity", 0.2);
        continue;
      }

      // ----- Boundaries -----
      if (layer.type === "line" && id.includes("boundary")) {
        map.setPaintProperty(layer.id, "line-color", c.boundary);
        map.setPaintProperty(layer.id, "line-opacity", 0.2);
        continue;
      }

      // ----- Text labels: major places -----
      if (
        layer.type === "symbol" &&
        (id.includes("place") || id.includes("city") || id.includes("town"))
      ) {
        map.setPaintProperty(layer.id, "text-color", c.labelMajor);
        map.setPaintProperty(layer.id, "text-opacity", 0.7);
        // Use serif-like rendering by adjusting halo for warmth
        map.setPaintProperty(layer.id, "text-halo-color", c.land);
        map.setPaintProperty(layer.id, "text-halo-width", 1.5);
        continue;
      }

      // ----- Text labels: everything else -----
      if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-color", c.labelMinor);
        map.setPaintProperty(layer.id, "text-opacity", 0.45);
        map.setPaintProperty(layer.id, "text-halo-color", c.land);
        map.setPaintProperty(layer.id, "text-halo-width", 1);
        continue;
      }
    } catch {
      // Some properties may not be settable — skip silently
    }
  }

  // Hide overly-detailed layers for a cleaner paper-map look
  for (const layer of style.layers) {
    for (const pattern of HIDE_PATTERNS) {
      if (layer.id.toLowerCase().includes(pattern)) {
        try {
          map.setLayoutProperty(layer.id, "visibility", "none");
        } catch {
          // skip
        }
      }
    }
  }
}
