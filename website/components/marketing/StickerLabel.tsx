import { type ReactNode, type CSSProperties } from "react";

interface StickerLabelProps {
  children: ReactNode;
  className?: string;
  rotation?: number;
  color?: string;
}

export default function StickerLabel({
  children,
  className = "",
  rotation = 0,
  color,
}: StickerLabelProps) {
  const accentColor = color || "var(--m-primary)";

  const style: CSSProperties = {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "var(--m-font-body)",
    fontWeight: 600,
    color: accentColor,
    background: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
    letterSpacing: "0.02em",
  };

  return (
    <span className={className} style={style}>
      {children}
    </span>
  );
}
