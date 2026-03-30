import { type ReactNode, type CSSProperties } from "react";

interface PostcardFrameProps {
  children: ReactNode;
  className?: string;
  caption?: string;
}

const captionStyle: CSSProperties = {
  fontFamily: "var(--m-font-accent)",
  fontSize: "20px",
  color: "var(--m-text-muted)",
  textAlign: "center",
  padding: "12px 16px",
  borderTop: "1px solid rgba(45, 41, 38, 0.12)",
};

export default function PostcardFrame({
  children,
  className = "",
  caption,
}: PostcardFrameProps) {
  return (
    <div className={`postcard-frame ${className}`} style={{ borderWidth: "1.5px" }}>
      {children}
      {caption && <div style={captionStyle}>{caption}</div>}
    </div>
  );
}
