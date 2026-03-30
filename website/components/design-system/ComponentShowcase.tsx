"use client";

import { ReactNode } from "react";

interface ComponentShowcaseProps {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}

export default function ComponentShowcase({
  title,
  description,
  children,
  id,
}: ComponentShowcaseProps) {
  return (
    <div id={id} className="scroll-mt-36">
      <div className="mb-4">
        <h3
          style={{
            fontFamily: "var(--m-font-body)",
            fontWeight: 700,
            fontSize: "18px",
            color: "var(--m-text)",
            marginBottom: description ? "4px" : "0",
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              fontFamily: "var(--m-font-body)",
              fontSize: "14px",
              color: "var(--m-text-muted)",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>
      <div
        style={{
          border: "2px dashed var(--m-text-muted)",
          borderRadius: "6px",
          padding: "32px",
          background: "var(--m-bg)",
          position: "relative",
          overflow: "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}
