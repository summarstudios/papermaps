"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "tokens", label: "Tokens" },
  { id: "cards", label: "Cards" },
  { id: "buttons", label: "Buttons" },
  { id: "cultural", label: "Cultural" },
  { id: "patterns", label: "Patterns" },
  { id: "animations", label: "Animations" },
];

export default function DesignNav() {
  const [active, setActive] = useState("tokens");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      aria-label="Design system sections"
      style={{
        position: "sticky",
        top: "72px",
        zIndex: 40,
        background: "var(--m-bg)",
        borderBottom: "3px solid var(--m-border)",
        marginBottom: "48px",
      }}
    >
      <div
        className="m-container scrollbar-hide"
        style={{
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          padding: "12px 24px",
        }}
      >
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            aria-current={active === id ? "true" : undefined}
            style={{
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "var(--m-font-body)",
              border: "2px solid var(--m-border)",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
              background: active === id ? "var(--m-accent)" : "var(--m-bg)",
              color: active === id ? "var(--m-text)" : "var(--m-text-muted)",
              boxShadow: active === id ? "var(--m-shadow-sm)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
