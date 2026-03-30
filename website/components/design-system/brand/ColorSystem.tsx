"use client";

import { useState, useRef, useEffect } from "react";

const palettes = [
  {
    group: "Ink & Paper",
    desc: "The foundation — warm paper backgrounds and ink-like foregrounds",
    colors: [
      { name: "Ink Black", hex: "#2D2926", usage: "Primary text, borders, logos" },
      { name: "Charcoal", hex: "#4A4540", usage: "Secondary text" },
      { name: "Pencil Gray", hex: "#6B6560", usage: "Muted text, captions" },
      { name: "Warm Gray", hex: "#A39E99", usage: "Disabled, dividers" },
      { name: "Paper Cream", hex: "#FDF6EC", usage: "Primary background" },
      { name: "Aged Paper", hex: "#F5E6D0", usage: "Card backgrounds" },
      { name: "Parchment", hex: "#EDD9C0", usage: "Alternate surfaces" },
      { name: "Bright Paper", hex: "#FFF9F0", usage: "Elevated surfaces" },
    ],
  },
  {
    group: "Watercolor Accents",
    desc: "Map-inspired colors — like watercolor washes on paper",
    colors: [
      { name: "Ocean Blue", hex: "#4A7FB5", usage: "Water, links, interactive" },
      { name: "Forest Green", hex: "#5B8C5A", usage: "Parks, nature, success" },
      { name: "Terra Cotta", hex: "#C4663A", usage: "Landmarks, primary accent" },
      { name: "Sunset Gold", hex: "#E8B84B", usage: "Highlights, ratings" },
      { name: "Dusty Rose", hex: "#C75B7A", usage: "Culture, heritage" },
      { name: "Deep Indigo", hex: "#3D5A99", usage: "Night, depth" },
    ],
  },
  {
    group: "Map Elements",
    desc: "Semantic colors for map-specific UI",
    colors: [
      { name: "Trail Red", hex: "#D64545", usage: "Routes, walking paths" },
      { name: "Road Amber", hex: "#D4943A", usage: "Major roads, transit" },
      { name: "Park Green", hex: "#6AAF6A", usage: "Green spaces, gardens" },
      { name: "Water Teal", hex: "#2E8B8B", usage: "Rivers, lakes, coast" },
      { name: "Building Tan", hex: "#C4B69C", usage: "Built areas" },
      { name: "Contour Brown", hex: "#8B7355", usage: "Elevation, terrain" },
    ],
  },
];

export default function ColorSystem() {
  const [copied, setCopied] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API not available in non-secure contexts
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {palettes.map(({ group, desc, colors }) => (
        <div key={group} style={{ marginBottom: 40 }}>
          <h3 style={{
            fontFamily: "Fraunces, serif",
            fontSize: 22,
            fontWeight: 600,
            color: "#2D2926",
            marginBottom: 4,
          }}>
            {group}
          </h3>
          <p style={{
            fontFamily: "Kalam, cursive",
            fontSize: 16,
            color: "#6B6560",
            marginBottom: 20,
          }}>
            {desc}
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
            gap: 16,
          }}>
            {colors.map((c) => (
              <button
                key={c.hex + c.name}
                onClick={() => handleCopy(c.hex)}
                style={{
                  border: "1.5px solid #8B7D6B",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#FFF9F0",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                <div style={{
                  height: 72,
                  background: c.hex,
                  borderBottom: "1.5px solid #8B7D6B",
                }} />
                <div style={{ padding: "12px 14px" }}>
                  <p style={{
                    fontFamily: "Fraunces, serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#2D2926",
                    marginBottom: 2,
                  }}>
                    {c.name}
                  </p>
                  <p style={{
                    fontFamily: "var(--m-font-body, DM Sans, sans-serif)",
                    fontSize: 12,
                    color: "#6B6560",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {copied === c.hex ? "Copied!" : c.hex}
                  </p>
                  <p style={{
                    fontFamily: "Kalam, cursive",
                    fontSize: 13,
                    color: "#A39E99",
                    marginTop: 4,
                  }}>
                    {c.usage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
