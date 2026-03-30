"use client";

import { useState } from "react";
import ComponentShowcase from "./ComponentShowcase";
import PropControl from "./PropControl";
import { CulturalProvider } from "@/components/cultural/CulturalProvider";
import { BackgroundPattern } from "@/components/cultural/BackgroundPattern";
import { SectionDivider } from "@/components/cultural/SectionDivider";
import { GoldAccent } from "@/components/cultural/GoldAccent";
import { FloatingMotifs } from "@/components/cultural/FloatingMotifs";
import { CityMark } from "@/components/cultural/CityMark";
import { getThemePreset, listPresetIds } from "@/lib/cultural-theme";

const presetIds = listPresetIds();

function LivePalette({ themeId }: { themeId: string }) {
  const theme = getThemePreset(themeId);
  const palette = theme.palette;
  const entries = [
    { label: "Primary", value: palette.primary },
    { label: "Secondary", value: palette.secondary },
    { label: "Accent", value: palette.accent },
    { label: "Gold", value: palette.gold },
    { label: "Deep", value: palette.deep },
    { label: "Background", value: palette.background },
    { label: "Surface", value: palette.surface },
    { label: "Text", value: palette.text },
    { label: "Border", value: palette.border },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
      {entries.map((e) => (
        <div key={e.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{
            height: "40px",
            background: e.value,
            border: "2px solid var(--m-border)",
            borderRadius: "4px",
          }} />
          <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
            {e.label}
          </span>
          <span style={{ fontSize: "9px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
            {e.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CulturalSection() {
  const [activeTheme, setActiveTheme] = useState(presetIds[0] || "default");
  const [patternType, setPatternType] = useState("dots");
  const [dividerVariant, setDividerVariant] = useState("simple");
  const [goldVariant, setGoldVariant] = useState("text");
  const [goldEndCaps, setGoldEndCaps] = useState("off");

  return (
    <section id="cultural" className="scroll-mt-36" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* Theme Switcher */}
      <ComponentShowcase
        title="Cultural Theme System"
        description="Switch themes to see how all cultural components update. Each city has its own palette, fonts, patterns, and motifs."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <PropControl
            label="Theme"
            options={presetIds}
            value={activeTheme}
            onChange={setActiveTheme}
          />
          <LivePalette themeId={activeTheme} />
        </div>
      </ComponentShowcase>

      {/* BackgroundPattern */}
      <ComponentShowcase
        title="BackgroundPattern"
        description="SVG-based background patterns that adapt to the active cultural theme"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Pattern"
            options={["paisley", "diamond", "dots", "tile", "wave"]}
            value={patternType}
            onChange={setPatternType}
          />
          <CulturalProvider theme={activeTheme}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
              paddingTop: "8px",
            }}>
              {/* Active pattern */}
              <div style={{
                position: "relative",
                height: "160px",
                border: "2px solid var(--m-border)",
                borderRadius: "6px",
                overflow: "hidden",
                background: "var(--c-background, var(--m-bg))",
              }}>
                <BackgroundPattern
                  pattern={patternType as "paisley" | "diamond" | "dots" | "tile" | "wave"}
                  opacity={0.15}
                />
                <div style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--c-text, var(--m-text))",
                  fontFamily: "var(--m-font-body)",
                }}>
                  {patternType}
                </div>
              </div>

              {/* All patterns mini */}
              {["paisley", "diamond", "dots", "tile", "wave"].filter((p) => p !== patternType).map((p) => (
                <div
                  key={p}
                  style={{
                    position: "relative",
                    height: "160px",
                    border: "1px solid var(--m-text-muted)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    background: "var(--c-background, var(--m-bg))",
                    cursor: "pointer",
                    opacity: 0.7,
                  }}
                  onClick={() => setPatternType(p)}
                >
                  <BackgroundPattern
                    pattern={p as "paisley" | "diamond" | "dots" | "tile" | "wave"}
                    opacity={0.15}
                  />
                  <div style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    fontSize: "12px",
                    color: "var(--c-text-muted, var(--m-text-muted))",
                    fontFamily: "var(--m-font-body)",
                  }}>
                    {p}
                  </div>
                </div>
              ))}
            </div>
          </CulturalProvider>
        </div>
      </ComponentShowcase>

      {/* SectionDivider */}
      <ComponentShowcase
        title="SectionDivider"
        description="SVG decorative dividers between page sections"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Variant"
            options={["simple", "lotus", "wave", "arch", "ornate"]}
            value={dividerVariant}
            onChange={setDividerVariant}
          />
          <CulturalProvider theme={activeTheme}>
            <div style={{ paddingTop: "8px" }}>
              <SectionDivider variant={dividerVariant as "lotus" | "wave" | "arch" | "simple" | "ornate"} />
            </div>
            <div style={{ marginTop: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "12px", fontFamily: "var(--m-font-body)" }}>
                All Variants
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {(["simple", "lotus", "wave", "arch", "ornate"] as const).map((v) => (
                  <div key={v}>
                    <span style={{ fontSize: "10px", color: "var(--m-text-muted)", fontFamily: "monospace", marginBottom: "4px", display: "block" }}>
                      {v}
                    </span>
                    <SectionDivider variant={v} />
                  </div>
                ))}
              </div>
            </div>
          </CulturalProvider>
        </div>
      </ComponentShowcase>

      {/* GoldAccent */}
      <ComponentShowcase
        title="GoldAccent"
        description="Text gradients, decorative lines, and flourishes in the theme's gold color"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <PropControl
              label="Variant"
              options={["text", "line", "flourish"]}
              value={goldVariant}
              onChange={setGoldVariant}
            />
            {goldVariant === "line" && (
              <PropControl
                label="End Caps"
                options={["off", "on"]}
                value={goldEndCaps}
                onChange={setGoldEndCaps}
              />
            )}
          </div>
          <CulturalProvider theme={activeTheme}>
            <div style={{ paddingTop: "8px" }}>
              {goldVariant === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <GoldAccent variant="text">
                    <span style={{ fontSize: "32px", fontFamily: "var(--m-font-display)", fontWeight: 700 }}>
                      Golden Heading Text
                    </span>
                  </GoldAccent>
                  <GoldAccent variant="text">
                    <span style={{ fontSize: "18px" }}>
                      Smaller gold text example
                    </span>
                  </GoldAccent>
                </div>
              )}
              {goldVariant === "line" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <GoldAccent variant="line" endCaps={goldEndCaps === "on"} />
                  <GoldAccent variant="line" endCaps={goldEndCaps === "on"} />
                </div>
              )}
              {goldVariant === "flourish" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
                  <GoldAccent variant="flourish" />
                  <GoldAccent variant="flourish" />
                </div>
              )}
            </div>
          </CulturalProvider>
        </div>
      </ComponentShowcase>

      {/* FloatingMotifs */}
      <ComponentShowcase
        title="FloatingMotifs"
        description="Scattered SVG shapes seeded for consistent layout"
      >
        <CulturalProvider theme={activeTheme}>
          <div style={{
            position: "relative",
            height: "200px",
            border: "1px solid var(--m-text-muted)",
            borderRadius: "6px",
            overflow: "hidden",
            background: "var(--c-background, var(--m-bg))",
          }}>
            <FloatingMotifs count={8} opacityScale={3} />
            <div style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontSize: "13px",
              color: "var(--c-text-muted, var(--m-text-muted))",
              fontFamily: "var(--m-font-body)",
            }}>
              Floating motifs from theme: {activeTheme}
            </div>
          </div>
        </CulturalProvider>
      </ComponentShowcase>

      {/* CityMark */}
      <ComponentShowcase
        title="CityMark"
        description="Theme-based city logo rendered as SVG stroke art (requires theme with logo)"
      >
        <CulturalProvider theme={activeTheme}>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-end", flexWrap: "wrap" }}>
            {[24, 32, 48, 64, 96].map((size) => (
              <div key={size} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <CityMark size={size} />
                <span style={{ fontSize: "10px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                  {size}px
                </span>
              </div>
            ))}
          </div>
        </CulturalProvider>
      </ComponentShowcase>
    </section>
  );
}
