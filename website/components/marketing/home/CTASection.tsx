"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import BrutalButton from "@/components/marketing/BrutalButton";

export default function CTASection() {
  return (
    <section className="m-section paper-texture" style={{ background: "var(--m-bg)" }}>
      <div className="m-container" style={{ position: "relative" }}>
        {/* Content */}
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="m-heading"
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              marginBottom: 20,
            }}
          >
            Ready to explore
            <br />
            your next city?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontFamily: "var(--m-font-body)",
              fontSize: "clamp(16px, 2.5vw, 19px)",
              color: "var(--m-text-muted)",
              lineHeight: 1.6,
              marginBottom: 36,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Pick a city, open the map, and discover places you never knew
            existed. No sign-up required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
            }}
          >
            <BrutalButton href="/explore" variant="primary">
              Explore Cities
              <ArrowRight size={18} strokeWidth={2.2} />
            </BrutalButton>
            <BrutalButton
              href="https://github.com/sagrkv/paper-maps"
              variant="secondary"
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </BrutalButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
