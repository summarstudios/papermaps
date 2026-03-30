"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";

interface City {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  country?: string;
  coverImageUrl?: string;
  status: string;
  _count?: { pois: number; itineraries: number; collections: number };
}

export default function ExplorePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE}/cities?status=PUBLISHED&limit=50`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setCities(json.data ?? []);
      } catch {
        // Silently handle — empty state shown
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider border-2 border-[var(--foreground)] rounded bg-[var(--m-accent)]">
              Explore
            </span>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--foreground)] mb-4"
              style={{ fontFamily: "var(--m-font-display, var(--font-fraunces), Georgia, serif)" }}
            >
              Pick Your City
            </h1>
            <p className="text-lg text-[var(--gray-400)] max-w-xl mx-auto leading-relaxed">
              Hand-curated maps with the best places to eat, drink, explore, and
              experience — made by locals who actually know.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cities Grid */}
      <section className="pb-24 lg:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : cities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-800)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--gray-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">No cities yet</h2>
              <p className="text-[var(--gray-400)]">
                We&apos;re curating our first city maps. Check back soon!
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city, i) => (
                <motion.div
                  key={city.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link
                    href={`/explore/${city.slug}`}
                    className="group block border-3 border-[var(--foreground)] rounded-md overflow-hidden bg-[var(--background)] transition-transform duration-200 hover:-translate-y-1"
                    style={{ boxShadow: "var(--m-shadow)" }}
                  >
                    {/* Image */}
                    <div className="aspect-[16/10] bg-[var(--gray-800)] relative overflow-hidden">
                      {city.coverImageUrl ? (
                        <img
                          src={city.coverImageUrl}
                          alt={city.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl font-bold text-[var(--gray-600)] opacity-40">
                            {city.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {/* Overlay badge */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[var(--m-accent)] border-2 border-[var(--foreground)] rounded">
                          {city.country || "India"}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 border-t-3 border-[var(--foreground)]">
                      <h3
                        className="text-xl font-bold text-[var(--foreground)] mb-1 group-hover:text-[var(--accent)] transition-colors"
                        style={{ fontFamily: "var(--m-font-display, var(--font-fraunces), Georgia, serif)" }}
                      >
                        {city.name}
                      </h3>
                      {city.tagline && (
                        <p className="text-[13px] text-[var(--gray-400)] line-clamp-2 mb-3">
                          {city.tagline}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[var(--gray-500)]">
                        {city._count?.pois !== undefined && (
                          <span>{city._count.pois} places</span>
                        )}
                        {city._count?.itineraries !== undefined && city._count.itineraries > 0 && (
                          <span>{city._count.itineraries} itineraries</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
