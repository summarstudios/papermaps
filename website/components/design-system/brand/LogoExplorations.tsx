"use client";

import { useState } from "react";

const logos = [
  {
    name: "The Folded Map",
    desc: "A paper map with fold lines and hand-marked points of interest",
    svg: (color: string) => (
      <svg viewBox="0 0 120 100" width="120" height="100">
        <path d="M 12,10 C 14,7 106,8 110,10 C 113,12 112,86 110,90 C 108,93 14,92 12,90 C 9,88 10,12 12,10 Z" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 42,10 C 43,30 41,60 42,90" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" />
        <path d="M 78,10 C 77,30 79,60 78,90" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" />
        <path d="M 22,35 L 28,41 M 28,35 L 22,41" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 57,55 L 63,61 M 63,55 L 57,61" stroke="#4A7FB5" strokeWidth="2" strokeLinecap="round" />
        <path d="M 90,30 L 96,36 M 96,30 L 90,36" stroke="#5B8C5A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "The Pin Drop",
    desc: "Classic map pin with a sketched, imperfect quality",
    svg: (color: string) => (
      <svg viewBox="0 0 80 110" width="80" height="110">
        <path d="M 40,8 C 20,8 8,22 8,40 C 8,62 38,98 40,100 C 42,98 72,62 72,40 C 72,22 60,8 40,8 Z" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="38" r="11" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="40" cy="38" r="3" fill="#C4663A" />
      </svg>
    ),
  },
  {
    name: "The Compass",
    desc: "A hand-drawn compass rose — exploration and discovery",
    svg: (color: string) => (
      <svg viewBox="0 0 100 100" width="100" height="100">
        <path d="M 50,12 L 44,42 L 50,36 L 56,42 Z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
        <path d="M 50,88 L 44,58 L 50,64 L 56,58 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 88,50 L 58,44 L 64,50 L 58,56 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 12,50 L 42,44 L 36,50 L 42,56 Z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="4.5" fill="#C4663A" stroke={color} strokeWidth="1.5" />
        <text x="50" y="8" textAnchor="middle" fontFamily="Kalam, cursive" fontSize="11" fill={color} fontWeight="700">N</text>
      </svg>
    ),
  },
  {
    name: "The Contour",
    desc: "Topographic lines forming a landscape — the terrain itself",
    svg: (color: string) => (
      <svg viewBox="0 0 120 80" width="120" height="80">
        <path d="M 10,65 C 25,58 45,48 60,42 C 78,35 98,38 112,48" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 18,55 C 32,45 50,34 65,28 C 82,22 98,26 108,36" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 30,44 C 42,34 56,24 70,20 C 85,16 98,20 105,28" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 45,34 C 54,25 64,18 74,16 C 84,14 92,18 98,24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 58,26 C 65,20 72,16 78,15 C 85,14 90,17 93,20" fill="none" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
        <circle cx="76" cy="16" r="2" fill="#C4663A" />
      </svg>
    ),
  },
];

export default function LogoExplorations() {
  const [darkBg, setDarkBg] = useState(false);
  const color = darkBg ? "#FDF6EC" : "#2D2926";
  const bg = darkBg ? "#2D2926" : "#FFF9F0";
  const mutedColor = darkBg ? "rgba(253,246,236,0.5)" : "#6B6560";

  return (
    <div style={{ marginTop: 24 }}>
      {/* Toggle */}
      <button
        onClick={() => setDarkBg(!darkBg)}
        style={{
          fontFamily: "Kalam, cursive",
          fontSize: 16,
          padding: "8px 16px",
          border: "1.5px solid #8B7D6B",
          borderRadius: "8px",
          background: darkBg ? "#2D2926" : "#FFF9F0",
          color: darkBg ? "#FDF6EC" : "#2D2926",
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        {darkBg ? "Light background" : "Dark background"}
      </button>

      {/* Logo marks */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 24,
      }}>
        {logos.map((logo) => (
          <div
            key={logo.name}
            style={{
              background: bg,
              border: `1.5px solid ${darkBg ? "rgba(253,246,236,0.2)" : "#8B7D6B"}`,
              borderRadius: "16px",
              padding: 32,
              textAlign: "center",
              transition: "background 0.3s, border-color 0.3s",
            }}
          >
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
              {logo.svg(color)}
            </div>
            <p style={{
              fontFamily: "Fraunces, serif",
              fontSize: 18,
              fontWeight: 600,
              color,
              marginBottom: 6,
            }}>
              {logo.name}
            </p>
            <p style={{
              fontFamily: "Kalam, cursive",
              fontSize: 15,
              color: mutedColor,
              lineHeight: 1.4,
            }}>
              {logo.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Wordmark options */}
      <div style={{
        marginTop: 32,
        background: bg,
        border: `1.5px solid ${darkBg ? "rgba(253,246,236,0.2)" : "#8B7D6B"}`,
        borderRadius: "16px",
        padding: "40px 32px",
        transition: "background 0.3s",
      }}>
        <p style={{
          fontFamily: "Kalam, cursive",
          fontSize: 14,
          color: mutedColor,
          marginBottom: 24,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>
          Wordmark Options
        </p>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          alignItems: "center",
        }}>
          <span style={{ fontFamily: "Kalam, cursive", fontSize: 48, color, fontWeight: 700 }}>
            Paper Maps
          </span>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 42, color, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Paper Maps
          </span>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 42, color, fontWeight: 400, letterSpacing: "0.05em", fontStyle: "italic" }}>
            Paper Maps
          </span>
          <span style={{
            fontFamily: "var(--m-font-body, DM Sans, sans-serif)",
            fontSize: 36,
            color,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            Paper Maps
          </span>
        </div>
      </div>
    </div>
  );
}
