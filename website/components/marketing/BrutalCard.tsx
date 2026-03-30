import { type ReactNode, type CSSProperties } from "react";

interface BrutalCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  rotate?: number;
}

export default function BrutalCard({
  children,
  className = "",
  hover = true,
  rotate = 0,
}: BrutalCardProps) {
  const style: CSSProperties = {};

  if (rotate !== 0) {
    style.transform = `rotate(${rotate}deg)`;
  }

  // When hover is disabled, prevent the CSS :hover transform from taking effect
  // by pinning the transform so the stylesheet rule can't override it
  if (!hover) {
    style.transform = style.transform ?? "none";
    style.boxShadow = "var(--m-shadow)";
    style.pointerEvents = "auto";
  }

  return (
    <div
      className={`brutal-card ${className}`}
      style={hover ? (rotate !== 0 ? style : undefined) : style}
      data-no-hover={!hover || undefined}
    >
      {children}
    </div>
  );
}
