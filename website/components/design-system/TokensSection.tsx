"use client";

import { useState } from "react";
import ComponentShowcase from "./ComponentShowcase";

const marketingColors = [
  { name: "--m-bg", value: "#FDF6EC", label: "Background" },
  { name: "--m-bg-alt", value: "#F5EDE0", label: "Background Alt" },
  { name: "--m-text", value: "#1A1A1A", label: "Text" },
  { name: "--m-text-muted", value: "#6B6355", label: "Text Muted" },
  { name: "--m-primary", value: "#2B44E0", label: "Primary" },
  { name: "--m-accent", value: "#E8C547", label: "Accent" },
  { name: "--m-accent-hover", value: "#D4B23E", label: "Accent Hover" },
  { name: "--m-border", value: "#1A1A1A", label: "Border" },
  { name: "--m-coral", value: "#E85D4A", label: "Coral" },
  { name: "--m-green", value: "#3A7D44", label: "Green" },
];

const grayScale = [
  { name: "--gray-950", value: "#FDF6EC" },
  { name: "--gray-900", value: "#F5EDE0" },
  { name: "--gray-850", value: "#EDE5D8" },
  { name: "--gray-800", value: "#E5DDD0" },
  { name: "--gray-750", value: "#DCD4C7" },
  { name: "--gray-700", value: "#C9C1B4" },
  { name: "--gray-600", value: "#A89F92" },
  { name: "--gray-500", value: "#8B8278" },
  { name: "--gray-400", value: "#6B6355" },
  { name: "--gray-300", value: "#4A4238" },
  { name: "--gray-200", value: "#2E2822" },
  { name: "--gray-100", value: "#1A1A1A" },
];

const fonts = [
  {
    name: "Fraunces",
    variable: "--m-font-display",
    role: "Display / Headings",
    weights: [400, 700, 800],
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    name: "DM Sans",
    variable: "--m-font-body",
    role: "Body / UI",
    weights: [400, 500, 600, 700],
    sample: "The quick brown fox jumps over the lazy dog",
  },
  {
    name: "Kalam",
    variable: "--m-font-accent",
    role: "Annotations / Handwritten",
    weights: [300, 400, 700],
    sample: "hand-drawn annotations & labels",
  },
  {
    name: "Space Grotesk",
    variable: "--font-space-grotesk",
    role: "Mono-ish / Technical",
    weights: [400, 500, 700],
    sample: "0123456789 ABCDEF code_block",
  },
];

const shadows = [
  { name: "--m-shadow-sm", css: "2px 2px 0 #1A1A1A", label: "Small" },
  { name: "--m-shadow", css: "4px 4px 0 #1A1A1A", label: "Default" },
  { name: "--m-shadow-lg", css: "6px 6px 0 #1A1A1A", label: "Large" },
  { name: "--shadow-sm", css: "0 1px 2px rgba(0,0,0,0.08)", label: "Soft SM" },
  { name: "--shadow-md", css: "0 4px 12px rgba(0,0,0,0.1)", label: "Soft MD" },
  { name: "--shadow-lg", css: "0 8px 32px rgba(0,0,0,0.12)", label: "Soft LG" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API requires secure context
    }
  };

  return (
    <button
      onClick={copy}
      style={{
        fontSize: "10px",
        fontWeight: 600,
        padding: "2px 6px",
        border: "1px solid var(--m-text-muted)",
        borderRadius: "3px",
        background: copied ? "var(--m-green)" : "transparent",
        color: copied ? "#fff" : "var(--m-text-muted)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        fontFamily: "var(--m-font-body)",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function TokensSection() {
  return (
    <section id="tokens" className="scroll-mt-36" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* Colors — Marketing */}
      <ComponentShowcase
        title="Marketing Colors"
        description="Core palette for the neo-brutalism marketing pages"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
          {marketingColors.map((c) => (
            <div key={c.name} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  width: "100%",
                  height: "56px",
                  background: c.value,
                  border: "2px solid var(--m-border)",
                  borderRadius: "4px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
                  {c.label}
                </span>
                <CopyButton text={c.value} />
              </div>
              <span style={{ fontSize: "10px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* Gray Scale */}
      <ComponentShowcase
        title="Gray Scale"
        description="Warm cream neutrals — high numbers are light, low numbers are dark"
      >
        <div style={{ display: "flex", gap: "0", borderRadius: "6px", overflow: "hidden", border: "2px solid var(--m-border)" }}>
          {grayScale.map((g) => (
            <div
              key={g.name}
              style={{
                flex: 1,
                height: "80px",
                background: g.value,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "4px 2px",
                minWidth: 0,
              }}
            >
              <span style={{
                fontSize: "8px",
                fontWeight: 700,
                color: (() => {
                  const r = parseInt(g.value.slice(1, 3), 16);
                  const gr = parseInt(g.value.slice(3, 5), 16);
                  const b = parseInt(g.value.slice(5, 7), 16);
                  return (r * 299 + gr * 587 + b * 114) / 1000 < 128 ? "#FDF6EC" : "#1A1A1A";
                })(),
                fontFamily: "monospace",
                textAlign: "center",
                lineHeight: 1.2,
                wordBreak: "break-all",
              }}>
                {g.name.replace("--gray-", "")}
              </span>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* Typography */}
      <ComponentShowcase
        title="Typography"
        description="Four fonts powering the design system"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {fonts.map((f) => (
            <div key={f.name} style={{ borderBottom: "1px solid var(--m-text-muted)", paddingBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
                  {f.name}
                </span>
                <span style={{ fontSize: "11px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                  {f.variable} &middot; {f.role}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {f.weights.map((w) => (
                  <div key={w} style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--m-text-muted)", fontFamily: "monospace", minWidth: "28px" }}>
                      {w}
                    </span>
                    <span style={{
                      fontFamily: `var(${f.variable}, ${f.name})`,
                      fontWeight: w,
                      fontSize: f.name === "Fraunces" ? "28px" : f.name === "Kalam" ? "24px" : "18px",
                      color: "var(--m-text)",
                      lineHeight: 1.3,
                    }}>
                      {f.sample}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* Shadows */}
      <ComponentShowcase
        title="Shadows"
        description="Brutal (offset) and soft shadow systems"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "24px" }}>
          {shadows.map((s) => (
            <div key={s.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "100px",
                  height: "72px",
                  background: "var(--m-bg)",
                  border: s.css.includes("0 #1A1A1A") ? "3px solid var(--m-border)" : "1px solid var(--gray-700)",
                  borderRadius: "6px",
                  boxShadow: s.css,
                }}
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                  {s.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* Spacing */}
      <ComponentShowcase
        title="Spacing & Layout"
        description="Key spacing tokens used throughout the system"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { label: "Nav Height", value: "72px", varName: "--m-nav-height" },
            { label: "Max Width", value: "1280px", varName: "--m-max-width" },
            { label: "Section Padding", value: "clamp(64px, 10vw, 140px)", varName: "--m-section-padding" },
            { label: "Container Padding", value: "24px / 48px (md)", varName: ".m-container" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--m-bg-alt)",
                borderRadius: "4px",
                border: "1px solid var(--m-text-muted)",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
                {s.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                  {s.varName}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--m-primary)", fontFamily: "monospace" }}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ComponentShowcase>
    </section>
  );
}
