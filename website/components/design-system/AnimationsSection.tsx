"use client";

import { useState, useCallback } from "react";
import ComponentShowcase from "./ComponentShowcase";

const keyframeAnimations = [
  { name: "animate-float", label: "Float", css: "float 6s ease-in-out infinite" },
  { name: "animate-pulse-glow", label: "Pulse Glow", css: "pulse-glow 3s ease-in-out infinite" },
  { name: "animate-shimmer", label: "Shimmer", css: "shimmer 2s infinite" },
  { name: "animate-stamp", label: "Stamp", css: "stamp-press 0.5s ease-out forwards" },
  { name: "animate-float-gentle", label: "Float Gentle", css: "float-gentle 4s ease-in-out infinite" },
  { name: "animate-wiggle", label: "Wiggle", css: "wiggle 3s ease-in-out infinite" },
];

const easings = [
  { name: "--ease-out-expo", value: "cubic-bezier(0.16, 1, 0.3, 1)", label: "Expo Out" },
  { name: "--ease-out-quart", value: "cubic-bezier(0.25, 1, 0.5, 1)", label: "Quart Out" },
  { name: "--ease-spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", label: "Spring" },
  { name: "ease", value: "ease", label: "CSS ease" },
  { name: "linear", value: "linear", label: "Linear" },
];

export default function AnimationsSection() {
  const [staggerKey, setStaggerKey] = useState(0);
  const [easingPlaying, setEasingPlaying] = useState(false);

  const replayStagger = useCallback(() => {
    setStaggerKey((k) => k + 1);
  }, []);

  const replayEasings = useCallback(() => {
    setEasingPlaying(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEasingPlaying(true);
      });
    });
  }, []);

  return (
    <section id="animations" className="scroll-mt-36" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* Keyframe animations */}
      <ComponentShowcase
        title="CSS Keyframe Animations"
        description="Built-in animation utility classes"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px" }}>
          {keyframeAnimations.map((anim) => (
            <div key={anim.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  background: "var(--m-accent)",
                  border: "3px solid var(--m-border)",
                  borderRadius: anim.name === "animate-pulse-glow" ? "50%" : "6px",
                }}
                className={anim.name}
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--m-text)", fontFamily: "var(--m-font-body)" }}>
                  {anim.label}
                </div>
                <div style={{ fontSize: "9px", color: "var(--m-text-muted)", fontFamily: "monospace" }}>
                  .{anim.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* Stagger children */}
      <ComponentShowcase
        title="Stagger Children"
        description="CSS-only staggered entrance animation using .stagger-children"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={replayStagger}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 600,
              border: "2px solid var(--m-border)",
              borderRadius: "4px",
              background: "var(--m-primary)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "var(--m-font-body)",
              alignSelf: "flex-start",
            }}
          >
            Replay
          </button>
          <div key={staggerKey} className="stagger-children" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: "80px",
                  height: "60px",
                  background: "var(--m-bg-alt)",
                  border: "2px solid var(--m-border)",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--m-text)",
                  boxShadow: "var(--m-shadow-sm)",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </ComponentShowcase>

      {/* Easing curves */}
      <ComponentShowcase
        title="Easing Functions"
        description="Custom CSS easing curves used throughout the system"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={replayEasings}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 600,
              border: "2px solid var(--m-border)",
              borderRadius: "4px",
              background: "var(--m-primary)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "var(--m-font-body)",
              alignSelf: "flex-start",
            }}
          >
            Play
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {easings.map((e) => (
              <div key={e.name} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--m-text)",
                  fontFamily: "var(--m-font-body)",
                  minWidth: "80px",
                  textAlign: "right",
                }}>
                  {e.label}
                </span>
                <div style={{
                  flex: 1,
                  height: "4px",
                  background: "var(--m-bg-alt)",
                  borderRadius: "2px",
                  position: "relative",
                  border: "1px solid var(--m-text-muted)",
                  overflow: "visible",
                }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "-6px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "var(--m-accent)",
                      border: "2px solid var(--m-border)",
                      left: easingPlaying ? "calc(100% - 16px)" : "0",
                      transition: easingPlaying ? `left 1.5s ${e.value}` : "none",
                    }}
                  />
                </div>
                <span style={{ fontSize: "9px", color: "var(--m-text-muted)", fontFamily: "monospace", minWidth: "120px" }}>
                  {e.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ComponentShowcase>

      {/* Utility classes */}
      <ComponentShowcase
        title="Utility Classes"
        description="Reusable CSS classes for common visual effects"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Glass */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              .glass
            </div>
            <div style={{ position: "relative", height: "80px", background: "linear-gradient(135deg, var(--m-coral), var(--m-primary))", borderRadius: "6px", overflow: "hidden" }}>
              <div
                className="glass"
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "16px",
                  right: "16px",
                  bottom: "16px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--m-text)",
                }}
              >
                Frosted glass overlay
              </div>
            </div>
          </div>

          {/* Card glow */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              .card-glow
            </div>
            <div
              className="card-glow"
              style={{
                padding: "20px",
                background: "var(--gray-800)",
                borderRadius: "8px",
                border: "1px solid var(--gray-700)",
                color: "var(--m-text)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Hover me to see the gradient border glow
            </div>
          </div>

          {/* Badges */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              .badge &amp; .badge-accent
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className="badge">Default Badge</span>
              <span className="badge badge-accent">Accent Badge</span>
            </div>
          </div>

          {/* Hover underline */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
              .m-hover-underline
            </div>
            <div style={{ display: "flex", gap: "20px" }}>
              {["Home", "About", "Services", "Contact"].map((link) => (
                <span
                  key={link}
                  className="m-hover-underline"
                  style={{
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--m-text)",
                    fontFamily: "var(--m-font-body)",
                  }}
                >
                  {link}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ComponentShowcase>
    </section>
  );
}
