import { type ReactNode, type CSSProperties } from "react";

interface StampBadgeProps {
  children: ReactNode;
  className?: string;
  rotation?: number;
}

export default function StampBadge({
  children,
  className = "",
  rotation = 0,
}: StampBadgeProps) {
  const style: CSSProperties = {
    display: "inline-block",
    border: "1.5px solid var(--m-border)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 14,
    fontFamily: "var(--m-font-body)",
    fontWeight: 600,
    color: "var(--m-text-muted)",
    background: "var(--m-bg)",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  };

  return (
    <span className={className} style={style}>
      {children}
    </span>
  );
}
