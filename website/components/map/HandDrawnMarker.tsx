"use client";

import { getCategoryIcon } from "./marker-icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandDrawnMarkerProps {
  /** Category slug used to select the inner icon (e.g. "food", "temple") */
  category?: string;
  /** Fill color for the pin body. Defaults to Ink Black. */
  color?: string;
  /** Height in pixels. 36 = default, 44 = must-visit / featured. */
  size?: number;
  /** Optional CSS class on the root <svg> */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

// ---------------------------------------------------------------------------
// Constants — Paper Maps brand tokens
// ---------------------------------------------------------------------------

const INK_BLACK = "#2D2926";
const PAPER_CREAM = "#FDF6EC";

// ---------------------------------------------------------------------------
// Pin outline path
//
// A teardrop / map-pin shape drawn with intentionally irregular cubic
// beziers. The viewBox is 40x52 — wider than tall to give room for the
// rounded top and pointed bottom.
//
// Anatomy:
//   - Top half: fat rounded blob (the "head")
//   - Bottom half: tapers to a slightly off-center point
//   - The curves wobble by 0.3-0.8px from mathematically perfect arcs
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

// Inner lighter stroke to add depth (inset shadow effect)
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
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a hand-drawn SVG map marker with a category icon inside.
 *
 * The marker is a teardrop pin with slightly irregular curves (drawn with
 * imperfect cubic beziers) and a small category icon in the rounded head.
 *
 * Designed to be used standalone in React, or converted to an HTML element
 * via `createMarkerElement` for MapLibre's `Marker` API.
 */
export default function HandDrawnMarker({
  category = "default",
  color = INK_BLACK,
  size = 36,
  className,
  label,
}: HandDrawnMarkerProps) {
  const icon = getCategoryIcon(category);

  // The pin viewBox is 40x52, so compute width from height
  const aspectRatio = 40 / 52;
  const width = Math.round(size * aspectRatio);

  // Icon is drawn in a 24x24 viewBox. We position it inside the pin head,
  // centered around (20, 16) in pin-space, scaled to fit nicely.
  // The icon region is roughly 18x18 units inside the 40x52 pin.
  const iconScale = 0.6;
  const iconOffsetX = 20 - 12 * iconScale; // center horizontally
  const iconOffsetY = 14 - 12 * iconScale; // center in upper blob

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 40 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={label || `${category} marker`}
    >
      {/* Drop shadow — subtle, warm */}
      <defs>
        <filter
          id={`shadow-${category}`}
          x="-20%"
          y="-10%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="1.5"
            stdDeviation="1.5"
            floodColor="#2D2926"
            floodOpacity="0.18"
          />
        </filter>
      </defs>

      {/* Pin body — filled with category color */}
      <path
        d={PIN_OUTLINE}
        fill={color}
        stroke={INK_BLACK}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#shadow-${category})`}
      />

      {/* Inner highlight for depth — lighter version of color */}
      <path
        d={PIN_HIGHLIGHT}
        fill="none"
        stroke={PAPER_CREAM}
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />

      {/* Category icon — positioned inside the pin head */}
      <g
        transform={`translate(${iconOffsetX}, ${iconOffsetY}) scale(${iconScale})`}
      >
        {/* Stroke-based icon paths */}
        {icon.paths.map((d, i) => (
          <path
            key={`s-${i}`}
            d={d}
            fill="none"
            stroke={PAPER_CREAM}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Filled accent paths (pupils, dots, etc.) */}
        {icon.fills?.map((d, i) => (
          <path
            key={`f-${i}`}
            d={d}
            fill={PAPER_CREAM}
            stroke="none"
          />
        ))}
      </g>
    </svg>
  );
}

// Re-export for convenience
export { INK_BLACK, PAPER_CREAM };
