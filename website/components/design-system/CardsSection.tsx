"use client";

import { useState } from "react";
import ComponentShowcase from "./ComponentShowcase";
import PropControl from "./PropControl";
import BrutalCard from "@/components/marketing/BrutalCard";
import PostcardFrame from "@/components/marketing/PostcardFrame";
import Card from "@/components/ui/Card";
import { CulturalProvider } from "@/components/cultural/CulturalProvider";
import { DecorativeCard } from "@/components/cultural/DecorativeCard";

export default function CardsSection() {
  const [brutalRotation, setBrutalRotation] = useState("0");
  const [brutalHover, setBrutalHover] = useState("on");
  const [decorativeVariant, setDecorativeVariant] = useState("simple");
  const [cardGlow, setCardGlow] = useState("off");

  return (
    <section id="cards" className="scroll-mt-36" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* BrutalCard */}
      <ComponentShowcase
        title="BrutalCard"
        description="Neo-brutalist card with solid border, offset shadow, and hover lift"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <PropControl
              label="Rotation"
              options={["-3", "-1", "0", "1", "3"]}
              value={brutalRotation}
              onChange={setBrutalRotation}
            />
            <PropControl
              label="Hover"
              options={["on", "off"]}
              value={brutalHover}
              onChange={setBrutalHover}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "24px", paddingTop: "8px" }}>
            <BrutalCard rotate={Number(brutalRotation)} hover={brutalHover === "on"}>
              <div style={{ padding: "20px" }}>
                <h4 style={{ fontFamily: "var(--m-font-display)", fontWeight: 700, fontSize: "18px", marginBottom: "8px" }}>
                  Card Title
                </h4>
                <p style={{ fontSize: "14px", color: "var(--m-text-muted)", lineHeight: 1.5 }}>
                  A basic brutal card with configurable rotation and hover.
                </p>
              </div>
            </BrutalCard>
            <BrutalCard rotate={Number(brutalRotation)} hover={brutalHover === "on"}>
              <div style={{ padding: "20px", textAlign: "center" }}>
                <span style={{ fontSize: "40px" }}>&#9733;</span>
                <p style={{ fontFamily: "var(--m-font-accent)", fontSize: "20px", color: "var(--m-coral)" }}>
                  Featured!
                </p>
              </div>
            </BrutalCard>
            <BrutalCard rotate={Number(brutalRotation)} hover={brutalHover === "on"}>
              <div style={{ padding: "20px" }}>
                <div style={{
                  background: "var(--m-primary)",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "inline-block",
                  marginBottom: "8px",
                }}>
                  NEW
                </div>
                <p style={{ fontSize: "14px", color: "var(--m-text)" }}>
                  Cards can hold any content.
                </p>
              </div>
            </BrutalCard>
          </div>
        </div>
      </ComponentShowcase>

      {/* PostcardFrame */}
      <ComponentShowcase
        title="PostcardFrame"
        description="Bordered frame for images with optional caption"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px" }}>
          <PostcardFrame caption="Mysore Palace at sunset">
            <div style={{
              height: "160px",
              background: "linear-gradient(135deg, #E8C547 0%, #E85D4A 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 600,
              color: "#1A1A1A",
            }}>
              Image Placeholder
            </div>
          </PostcardFrame>
          <PostcardFrame>
            <div style={{
              height: "160px",
              background: "linear-gradient(135deg, #2B44E0 0%, #3A7D44 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
            }}>
              No Caption
            </div>
          </PostcardFrame>
        </div>
      </ComponentShowcase>

      {/* DecorativeCard */}
      <ComponentShowcase
        title="DecorativeCard"
        description="Cultural theme cards with ornamental variants — requires CulturalProvider"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Variant"
            options={["simple", "palace", "frame", "leaf"]}
            value={decorativeVariant}
            onChange={setDecorativeVariant}
          />
          <CulturalProvider theme="mysore">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px", paddingTop: "8px" }}>
              <DecorativeCard variant={decorativeVariant as "simple" | "palace" | "frame" | "leaf"}>
                <h4 style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
                  Decorative Card
                </h4>
                <p style={{ fontSize: "14px", opacity: 0.7 }}>
                  Try switching variants to see different ornamental styles.
                </p>
              </DecorativeCard>
              <DecorativeCard variant={decorativeVariant as "simple" | "palace" | "frame" | "leaf"} disableHover>
                <h4 style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
                  Hover Disabled
                </h4>
                <p style={{ fontSize: "14px", opacity: 0.7 }}>
                  Same variant without hover glow effect.
                </p>
              </DecorativeCard>
            </div>
          </CulturalProvider>
        </div>
      </ComponentShowcase>

      {/* UI Card */}
      <ComponentShowcase
        title="Card (UI)"
        description="Base card component with optional hover animation and glow border"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Glow"
            options={["off", "on"]}
            value={cardGlow}
            onChange={setCardGlow}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            <Card hover glow={cardGlow === "on"}>
              <div style={{ padding: "8px" }}>
                <h4 style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)", marginBottom: "4px" }}>
                  Hover + Glow
                </h4>
                <p style={{ fontSize: "13px", color: "var(--gray-400)" }}>
                  Animated card
                </p>
              </div>
            </Card>
            <Card hover={false}>
              <div style={{ padding: "8px" }}>
                <h4 style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)", marginBottom: "4px" }}>
                  Static
                </h4>
                <p style={{ fontSize: "13px", color: "var(--gray-400)" }}>
                  No hover effect
                </p>
              </div>
            </Card>
          </div>
        </div>
      </ComponentShowcase>
    </section>
  );
}
