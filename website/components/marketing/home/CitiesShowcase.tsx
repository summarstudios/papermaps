"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeading from "@/components/marketing/SectionHeading";
import BrutalCard from "@/components/marketing/BrutalCard";
import BrutalButton from "@/components/marketing/BrutalButton";

const cityImages: Record<string, string> = {
  mysore: "/images/cities/mysore.jpg",
  bangalore: "/images/cities/bangalore.jpg",
  hampi: "/images/cities/hampi.jpg",
  coorg: "/images/cities/coorg.jpg",
  goa: "/images/cities/goa.jpg",
  pondicherry: "/images/cities/pondicherry.jpg",
};

interface City {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  poiCount?: number;
  primaryColor?: string;
}

const FALLBACK_CITIES: City[] = [
  { id: "1", name: "Mysore", slug: "mysore", tagline: "City of Palaces", poiCount: 45, primaryColor: "#8B6914" },
  { id: "2", name: "Bangalore", slug: "bangalore", tagline: "Garden City", poiCount: 62, primaryColor: "#2D6A4F" },
  { id: "3", name: "Hampi", slug: "hampi", tagline: "Ruins & Boulders", poiCount: 38, primaryColor: "#B85C38" },
  { id: "4", name: "Coorg", slug: "coorg", tagline: "Scotland of India", poiCount: 28, primaryColor: "#2D5F2D" },
  { id: "5", name: "Goa", slug: "goa", tagline: "Sun, Sand & Soul", poiCount: 55, primaryColor: "#1E6091" },
  { id: "6", name: "Pondicherry", slug: "pondicherry", tagline: "French Quarter Charm", poiCount: 32, primaryColor: "#C2703E" },
];

export default function CitiesShowcase() {
  const [cities, setCities] = useState<City[]>(FALLBACK_CITIES);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch("/api/v1/cities?status=PUBLISHED", {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCities(
            data.map((c: Record<string, unknown>) => ({
              id: String(c.id || ""),
              name: String(c.name || ""),
              slug: String(c.slug || ""),
              tagline: c.tagline ? String(c.tagline) : undefined,
              poiCount: typeof c.poiCount === "number" ? c.poiCount : undefined,
              primaryColor: c.primaryColor ? String(c.primaryColor) : undefined,
            }))
          );
        }
      } catch {
        // Silently fall back to static data
      }
    };
    fetchCities();
  }, []);

  return (
    <section className="m-section m-section-alt">
      <div className="m-container">
        <SectionHeading
          title="Curated city maps"
          subtitle="handpicked by locals"
          className="mb-12 md:mb-16"
        />

        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          }}
        >
          {cities.map((city, i) => {
            const rotation = i % 2 === 0 ? 1 : -1;
            const color = city.primaryColor || "#2B44E0";

            return (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <Link
                  href={`/explore/${city.slug}`}
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  <BrutalCard rotate={rotation} className="h-full">
                    {/* City image */}
                    <div
                      style={{
                        position: "relative",
                        height: 180,
                        overflow: "hidden",
                        borderRadius: "3px 3px 0 0",
                        marginTop: -1,
                      }}
                    >
                      {cityImages[city.slug] ? (
                        <Image
                          src={cityImages[city.slug]}
                          alt={`${city.name} - ${city.tagline || "city photo"}`}
                          width={800}
                          height={450}
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(135deg, #f5f0e8 0%, #ebe4d6 100%)",
                          }}
                        />
                      )}
                      {/* Warm gradient overlay at bottom */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 60,
                          background: "linear-gradient(to top, rgba(255,252,247,0.85) 0%, rgba(255,252,247,0) 100%)",
                          pointerEvents: "none",
                        }}
                      />
                      {/* Color accent bar overlaid at bottom of image */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: color,
                        }}
                      />
                    </div>

                    <div style={{ padding: "20px 24px 24px" }}>
                      <h3
                        style={{
                          fontFamily: "var(--m-font-display)",
                          fontWeight: 700,
                          fontSize: 24,
                          lineHeight: 1.2,
                          marginBottom: 4,
                          color: "var(--m-text)",
                        }}
                      >
                        {city.name}
                      </h3>

                      {city.tagline && (
                        <p
                          style={{
                            fontFamily: "var(--m-font-body)",
                            fontSize: 15,
                            color: "var(--m-text-muted)",
                            marginBottom: 16,
                            lineHeight: 1.4,
                          }}
                        >
                          {city.tagline}
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--m-font-body)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--m-text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {city.poiCount ? `${city.poiCount} places` : "Coming soon"}
                        </span>
                        <ArrowRight size={18} strokeWidth={2} style={{ color: "var(--m-text-muted)" }} />
                      </div>
                    </div>
                  </BrutalCard>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <BrutalButton href="/explore" variant="secondary">
            View All Cities
            <ArrowRight size={16} strokeWidth={2.2} />
          </BrutalButton>
        </div>
      </div>
    </section>
  );
}
