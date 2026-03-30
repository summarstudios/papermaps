"use client";

import { useState } from "react";
import ComponentShowcase from "./ComponentShowcase";
import PropControl from "./PropControl";
import BrutalButton from "@/components/marketing/BrutalButton";
import StampBadge from "@/components/marketing/StampBadge";
import StickerLabel from "@/components/marketing/StickerLabel";
import Button from "@/components/ui/Button";

export default function ButtonsSection() {
  const [brutalVariant, setBrutalVariant] = useState("primary");
  const [uiVariant, setUiVariant] = useState("primary");
  const [uiSize, setUiSize] = useState("md");
  const [stampRotation, setStampRotation] = useState("-2");
  const [stickerRotation, setStickerRotation] = useState("2");

  return (
    <section id="buttons" className="scroll-mt-36" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {/* BrutalButton */}
      <ComponentShowcase
        title="BrutalButton"
        description="Neo-brutalist button with solid border and offset shadow"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Variant"
            options={["primary", "secondary", "blue"]}
            value={brutalVariant}
            onChange={setBrutalVariant}
          />
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", paddingTop: "8px" }}>
            <BrutalButton variant={brutalVariant as "primary" | "secondary" | "blue"}>
              Click Me
            </BrutalButton>
            <BrutalButton variant={brutalVariant as "primary" | "secondary" | "blue"}>
              With Arrow &rarr;
            </BrutalButton>
          </div>
        </div>
      </ComponentShowcase>

      {/* All 3 variants side by side */}
      <ComponentShowcase
        title="BrutalButton Variants"
        description="All three variants compared"
      >
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <BrutalButton variant="primary">Primary</BrutalButton>
          <BrutalButton variant="secondary">Secondary</BrutalButton>
          <BrutalButton variant="blue">Blue</BrutalButton>
        </div>
      </ComponentShowcase>

      {/* UI Button */}
      <ComponentShowcase
        title="Button (UI)"
        description="Versatile button for the app UI — supports href, loading, and disabled states"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <PropControl
              label="Variant"
              options={["primary", "secondary", "ghost"]}
              value={uiVariant}
              onChange={setUiVariant}
            />
            <PropControl
              label="Size"
              options={["sm", "md", "lg"]}
              value={uiSize}
              onChange={setUiSize}
            />
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", paddingTop: "8px" }}>
            <Button
              variant={uiVariant as "primary" | "secondary" | "ghost"}
              size={uiSize as "sm" | "md" | "lg"}
            >
              Default
            </Button>
            <Button
              variant={uiVariant as "primary" | "secondary" | "ghost"}
              size={uiSize as "sm" | "md" | "lg"}
              loading
            >
              Loading
            </Button>
            <Button
              variant={uiVariant as "primary" | "secondary" | "ghost"}
              size={uiSize as "sm" | "md" | "lg"}
              disabled
            >
              Disabled
            </Button>
          </div>
        </div>
      </ComponentShowcase>

      {/* Variant x Size matrix */}
      <ComponentShowcase
        title="Button Matrix"
        description="All variant and size combinations"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {(["primary", "secondary", "ghost"] as const).map((v) => (
            <div key={v}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--m-text-muted)", marginBottom: "8px", fontFamily: "var(--m-font-body)" }}>
                {v}
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                {(["sm", "md", "lg"] as const).map((s) => (
                  <Button key={s} variant={v} size={s}>
                    {s.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ComponentShowcase>

      {/* StampBadge */}
      <ComponentShowcase
        title="StampBadge"
        description="Dashed-border badge with handwritten font and rotation"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Rotation"
            options={["-5", "-2", "0", "2", "5"]}
            value={stampRotation}
            onChange={setStampRotation}
          />
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center", paddingTop: "8px" }}>
            <StampBadge rotation={Number(stampRotation)}>
              Hand-picked
            </StampBadge>
            <StampBadge rotation={Number(stampRotation)}>
              Since 2024
            </StampBadge>
            <StampBadge rotation={Number(stampRotation)}>
              Curated
            </StampBadge>
          </div>
        </div>
      </ComponentShowcase>

      {/* StickerLabel */}
      <ComponentShowcase
        title="StickerLabel"
        description="Bold uppercase label sticker with optional custom color"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <PropControl
            label="Rotation"
            options={["-3", "0", "2", "5"]}
            value={stickerRotation}
            onChange={setStickerRotation}
          />
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", paddingTop: "8px" }}>
            <StickerLabel rotation={Number(stickerRotation)}>
              Default
            </StickerLabel>
            <StickerLabel rotation={Number(stickerRotation)} color="#E85D4A">
              Coral
            </StickerLabel>
            <StickerLabel rotation={Number(stickerRotation)} color="#2B44E0">
              <span style={{ color: "#fff" }}>Blue</span>
            </StickerLabel>
            <StickerLabel rotation={Number(stickerRotation)} color="#3A7D44">
              <span style={{ color: "#fff" }}>Green</span>
            </StickerLabel>
          </div>
        </div>
      </ComponentShowcase>
    </section>
  );
}
