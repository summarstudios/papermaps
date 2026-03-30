/**
 * Hand-drawn SVG compass rose for the map.
 *
 * A small (60x60px), subtle compass element positioned in the bottom-left
 * of the map. Drawn with intentionally wobbly paths to match the Paper Maps
 * hand-drawn brand aesthetic.
 *
 * Uses `pointer-events: none` to avoid intercepting map interactions.
 */

interface CompassRoseProps {
  /** Position corner. Defaults to "bottom-left". */
  position?: "bottom-left" | "top-right" | "bottom-right" | "top-left";
  /** Size in pixels. Defaults to 60. */
  size?: number;
  /** Primary color for the compass. Defaults to Ink Black. */
  color?: string;
  /** Accent color for the N arrow. Defaults to Terra Cotta. */
  accentColor?: string;
  /** Optional extra CSS class */
  className?: string;
}

const INK_BLACK = "#2D2926";
const TERRA_COTTA = "#C4663A";
const PAPER_CREAM = "#FDF6EC";

export default function CompassRose({
  position = "bottom-left",
  size = 60,
  color = INK_BLACK,
  accentColor = TERRA_COTTA,
  className = "",
}: CompassRoseProps) {
  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    "bottom-left": { bottom: 60, left: 12 },
    "top-right": { top: 12, right: 12 },
    "bottom-right": { bottom: 60, right: 12 },
    "top-left": { top: 12, left: 12 },
  };

  return (
    <div
      className={`absolute z-[3] pointer-events-none ${className}`}
      style={{
        ...positionStyles[position],
        width: size,
        height: size,
        opacity: 0.55,
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/*
         * The compass is drawn in a 60x60 viewBox with center at (30, 30).
         * All paths use slightly irregular curves for a hand-drawn feel.
         */}

        {/* Outer ring — hand-drawn circle */}
        <circle
          cx="30"
          cy="30"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.4"
        />

        {/* Inner ring — slightly smaller, solid */}
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.25"
        />

        {/* North arrow — filled with accent (terra cotta) */}
        <path
          d="M30.0 6.5 L27.2 28.5 L30.0 25.0 L32.8 28.5 Z"
          fill={accentColor}
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* South arrow — outline only, paper fill */}
        <path
          d="M30.0 53.5 L32.8 31.5 L30.0 35.0 L27.2 31.5 Z"
          fill={PAPER_CREAM}
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />

        {/* East arrow — subtle, thin */}
        <path
          d="M53.5 30.0 L31.5 27.2 L35.0 30.0 L31.5 32.8 Z"
          fill={PAPER_CREAM}
          stroke={color}
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />

        {/* West arrow — subtle, thin */}
        <path
          d="M6.5 30.0 L28.5 32.8 L25.0 30.0 L28.5 27.2 Z"
          fill={PAPER_CREAM}
          stroke={color}
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />

        {/* Center dot — small hand-drawn circle */}
        <circle
          cx="30"
          cy="30"
          r="2.5"
          fill={color}
          stroke={color}
          strokeWidth="0.5"
          opacity="0.6"
        />
        <circle
          cx="30"
          cy="30"
          r="1"
          fill={PAPER_CREAM}
          opacity="0.8"
        />

        {/* "N" label — hand-drawn feel, slightly off-center for charm */}
        <text
          x="30"
          y="3.5"
          textAnchor="middle"
          fill={accentColor}
          fontSize="6"
          fontFamily="serif"
          fontWeight="700"
          letterSpacing="0.05em"
          opacity="0.85"
        >
          N
        </text>

        {/* Tick marks at intercardinal points — tiny dashes */}
        {/* NE */}
        <line
          x1="46.5"
          y1="13.5"
          x2="44.5"
          y2="15.5"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.3"
          strokeLinecap="round"
        />
        {/* NW */}
        <line
          x1="13.5"
          y1="13.5"
          x2="15.5"
          y2="15.5"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.3"
          strokeLinecap="round"
        />
        {/* SE */}
        <line
          x1="46.5"
          y1="46.5"
          x2="44.5"
          y2="44.5"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.3"
          strokeLinecap="round"
        />
        {/* SW */}
        <line
          x1="13.5"
          y1="46.5"
          x2="15.5"
          y2="44.5"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
