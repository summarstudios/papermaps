"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import BrutalButton from "@/components/marketing/BrutalButton";
import StampBadge from "@/components/marketing/StampBadge";

const stats = [
  { label: "Cities", value: "12+" },
  { label: "Places", value: "500+" },
  { label: "Free", value: "100%" },
];

const easeOut: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: easeOut },
  }),
};

export default function HeroSection() {
  return (
    <section className="m-section paper-texture" style={{ background: "var(--m-bg)" }}>
      <div className="m-container" style={{ position: "relative" }}>
        {/* Main hero content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 820,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Subtle pill badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: 20 }}
          >
            <StampBadge>Free &middot; Open Source &middot; Hand-Curated</StampBadge>
          </motion.div>

          {/* Annotation */}
          <motion.span
            custom={0.5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="m-annotation"
            style={{
              fontSize: "clamp(20px, 3vw, 28px)",
              display: "inline-block",
              marginBottom: 16,
            }}
          >
            ~ your personal travel zine ~
          </motion.span>

          {/* Main heading */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="m-heading"
            style={{
              fontSize: "clamp(40px, 8vw, 80px)",
              marginBottom: 24,
              lineHeight: 1.05,
            }}
          >
            Explore cities
            <br />
            <span style={{ color: "var(--m-primary)" }}>like a local</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              fontFamily: "var(--m-font-body)",
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "var(--m-text-muted)",
              maxWidth: 560,
              lineHeight: 1.6,
              marginBottom: 40,
            }}
          >
            Beautifully curated, city-themed tourist maps. Hand-picked places,
            ready-made itineraries, and honest local knowledge. Completely free.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
              marginBottom: 56,
            }}
          >
            <BrutalButton href="/explore" variant="primary">
              Explore Cities
              <ArrowRight size={18} strokeWidth={2.2} />
            </BrutalButton>
            <BrutalButton href="#how-it-works" variant="secondary">
              See How It Works
            </BrutalButton>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="brutal-card"
                style={{
                  padding: "14px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  minWidth: 130,
                }}
                data-no-hover
              >
                <span
                  style={{
                    fontFamily: "var(--m-font-display)",
                    fontWeight: 800,
                    fontSize: 28,
                    lineHeight: 1.1,
                    color: "var(--m-text)",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily: "var(--m-font-body)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--m-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
