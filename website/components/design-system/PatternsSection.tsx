"use client";

import { useState } from "react";
import ComponentShowcase from "./ComponentShowcase";
import PropControl from "./PropControl";
import GlowOrb, { GlowOrbCluster } from "@/components/visuals/GlowOrb";
import WavyDivider from "@/components/marketing/WavyDivider";

export default function PatternsSection() {
  const [orbSize, setOrbSize] = useState("md");
  const [orbIntensity, setOrbIntensity] = useState("medium");

  return (
    <section id="patterns" className="scroll-mt-36" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* CSS Patterns */}
      <ComponentShowcase
        title="CSS Background Patterns"
        description="Utility classes for subtle background textures"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
          {[
            { name: "grid-pattern", label: "Grid" },
            { name: "dot-pattern", label: "Dots" },
            { name: "noise", label: "Noise" },
            { name: "paper-texture", label: "Paper Texture" },
          ].map((p) => (
            <div key={p.name} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                className={p.name}
                style={{
                  height: "120px",
                  border: "2px solid var(--m-border)",
                  borderRadius: "6px",
                  position: "relative",
                  background: "var(--m-bg)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
                  {p.label}
                </span>
                <span style={{ fontSize: "10px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                  .{p.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* GlowOrb */}
      <ComponentShowcase
        title="GlowOrb"
        description="Animated blurred gradient orb — positioned absolutely within a relative container"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <PropControl
              label="Size"
              options={["sm", "md", "lg"]}
              value={orbSize}
              onChange={setOrbSize}
            />
            <PropControl
              label="Intensity"
              options={["low", "medium", "high"]}
              value={orbIntensity}
              onChange={setOrbIntensity}
            />
          </div>
          <div style={{
            position: "relative",
            height: "200px",
            border: "2px solid var(--m-border)",
            borderRadius: "6px",
            overflow: "hidden",
            background: "#1A1A1A",
          }}>
            <GlowOrb
              className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              size={orbSize as "sm" | "md" | "lg"}
              intensity={orbIntensity as "low" | "medium" | "high"}
              color="var(--accent)"
            />
            <div style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontSize: "12px",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--m-font-body)",
            }}>
              {orbSize} / {orbIntensity}
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* GlowOrbCluster */}
      <ComponentShowcase
        title="GlowOrbCluster"
        description="Pre-composed multi-color orb arrangement"
      >
        <div style={{
          position: "relative",
          height: "240px",
          border: "2px solid var(--m-border)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "#1A1A1A",
        }}>
          <GlowOrbCluster />
          <div style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontSize: "12px",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--m-font-body)",
          }}>
            Three orbs: accent, blue, accent
          </div>
        </div>
      </ComponentShowcase>

      {/* WavyDivider */}
      <ComponentShowcase
        title="WavyDivider"
        description="SVG wave used to transition between sections"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              Normal
            </div>
            <div style={{ background: "var(--m-bg-alt)", borderRadius: "6px", overflow: "hidden", border: "2px solid var(--m-border)" }}>
              <div style={{ height: "40px", background: "var(--m-bg-alt)" }} />
              <WavyDivider color="var(--m-bg)" />
              <div style={{ height: "40px", background: "var(--m-bg)" }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              Flipped
            </div>
            <div style={{ background: "var(--m-bg)", borderRadius: "6px", overflow: "hidden", border: "2px solid var(--m-border)" }}>
              <div style={{ height: "40px", background: "var(--m-bg)" }} />
              <WavyDivider flip color="var(--m-bg-alt)" />
              <div style={{ height: "40px", background: "var(--m-bg-alt)" }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              Custom Color
            </div>
            <div style={{ background: "var(--m-bg-alt)", borderRadius: "6px", overflow: "hidden", border: "2px solid var(--m-border)" }}>
              <div style={{ height: "40px", background: "var(--m-bg-alt)" }} />
              <WavyDivider color="#2B44E0" />
              <div style={{ height: "40px", background: "#2B44E0" }} />
            </div>
          </div>
        </div>
      </ComponentShowcase>
    </section>
  );
}
