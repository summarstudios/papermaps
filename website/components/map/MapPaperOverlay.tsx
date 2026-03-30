/**
 * Paper texture overlay for the map.
 *
 * Adds a subtle layer on top of the MapLibre canvas that gives it the feel
 * of an actual paper map:
 *
 * - Very subtle noise texture via CSS radial-gradient dots
 * - Slightly darkened edges (vignette) via inset box-shadow
 * - A thin, slightly irregular border around the map area
 *
 * IMPORTANT: This overlay uses `pointer-events: none` so all map interactions
 * (pan, zoom, click, hover) pass through to the map canvas below.
 */

interface MapPaperOverlayProps {
  /** Optional border color — defaults to warm pencil brown */
  borderColor?: string;
  /** Whether to show the vignette darkening at edges. Defaults to true. */
  showVignette?: boolean;
  /** Whether to show the paper grain texture. Defaults to true. */
  showGrain?: boolean;
}

export default function MapPaperOverlay({
  borderColor = "#C8BCA0",
  showVignette = true,
  showGrain = true,
}: MapPaperOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    >
      {/* Paper grain texture — tiny dots at very low opacity */}
      {showGrain && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(139, 128, 112, 0.04) 1px, transparent 1px),
              radial-gradient(circle at 70% 60%, rgba(139, 128, 112, 0.03) 1px, transparent 1px),
              radial-gradient(circle at 40% 80%, rgba(139, 128, 112, 0.04) 1px, transparent 1px),
              radial-gradient(circle at 85% 15%, rgba(139, 128, 112, 0.03) 1px, transparent 1px),
              radial-gradient(circle at 10% 70%, rgba(139, 128, 112, 0.04) 1px, transparent 1px),
              radial-gradient(circle at 55% 40%, rgba(139, 128, 112, 0.03) 1px, transparent 1px)
            `,
            backgroundSize:
              "13px 11px, 17px 19px, 23px 13px, 11px 17px, 19px 23px, 7px 9px",
          }}
        />
      )}

      {/* Vignette — darkened edges */}
      {showVignette && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(90, 80, 64, 0.08) 100%)",
          }}
        />
      )}

      {/* Hand-drawn border — slightly irregular via border-radius wobble */}
      <div
        className="absolute inset-[3px]"
        style={{
          border: `1.5px solid ${borderColor}40`,
          borderRadius: "4px 6px 5px 7px",
          // Second inner border for sketch effect
          boxShadow: `inset 0 0 0 1px ${borderColor}15`,
        }}
      />

      {/* Fold mark hint — very subtle horizontal line across the center */}
      <div
        className="absolute left-[10%] right-[10%]"
        style={{
          top: "50%",
          height: "1px",
          background: `linear-gradient(
            90deg,
            transparent 0%,
            ${borderColor}08 15%,
            ${borderColor}12 50%,
            ${borderColor}08 85%,
            transparent 100%
          )`,
        }}
      />

      {/* Vertical fold mark */}
      <div
        className="absolute top-[10%] bottom-[10%]"
        style={{
          left: "50%",
          width: "1px",
          background: `linear-gradient(
            180deg,
            transparent 0%,
            ${borderColor}06 15%,
            ${borderColor}10 50%,
            ${borderColor}06 85%,
            transparent 100%
          )`,
        }}
      />
    </div>
  );
}
