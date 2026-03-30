import { type CSSProperties } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  centered?: boolean;
}

export default function SectionHeading({
  title,
  subtitle,
  className = "",
  centered = true,
}: SectionHeadingProps) {
  const wrapperStyle: CSSProperties = {
    textAlign: centered ? "center" : "left",
  };

  return (
    <div className={className} style={wrapperStyle}>
      {subtitle && (
        <span
          className="m-annotation"
          style={{ display: "block", fontSize: "24px", marginBottom: "8px" }}
        >
          {subtitle}
        </span>
      )}
      <h2 className="m-heading" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
        {title}
      </h2>
    </div>
  );
}
