import { type CSSProperties } from "react";

interface WavyDividerProps {
  className?: string;
  flip?: boolean;
  color?: string;
}

export default function WavyDivider({
  className = "",
  flip = false,
  color,
}: WavyDividerProps) {
  const style: CSSProperties = {
    display: "block",
    width: "100%",
  };

  if (flip) {
    style.transform = "scaleY(-1)";
  }

  const fillColor = color ?? "var(--m-bg)";

  return (
    <svg
      className={`wavy-divider ${className}`}
      style={style}
      viewBox="0 0 1440 24"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0,12 C120,21 240,0 360,12 C480,24 600,3 720,12 C840,21 960,0 1080,12 C1200,24 1320,3 1440,12 L1440,24 L0,24 Z"
        fill={fillColor}
        opacity={0.5}
      />
    </svg>
  );
}
