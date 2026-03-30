import { Map, Paintbrush, Route, Smartphone, Gift, Users } from "lucide-react";
import SectionHeading from "@/components/marketing/SectionHeading";
import BrutalCard from "@/components/marketing/BrutalCard";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg: string;
}

const features: Feature[] = [
  {
    icon: <Map size={24} strokeWidth={1.8} />,
    title: "Curated Maps",
    description: "Every city gets a beautifully designed, interactive map with hand-picked places. No algorithm noise -- just the spots locals actually love.",
    iconBg: "var(--m-primary)",
  },
  {
    icon: <Paintbrush size={24} strokeWidth={1.8} />,
    title: "City-Themed Design",
    description: "Each city gets its own unique visual identity -- colors, typography, and vibe that capture the character of the place.",
    iconBg: "var(--m-coral)",
  },
  {
    icon: <Route size={24} strokeWidth={1.8} />,
    title: "Ready-Made Itineraries",
    description: "One-day, two-day, or weekend itineraries crafted by people who know the city. Just follow the route and enjoy.",
    iconBg: "var(--m-accent)",
  },
  {
    icon: <Smartphone size={24} strokeWidth={1.8} />,
    title: "Mobile-First",
    description: "Maps and guides that work perfectly on your phone. Pull up a map while walking, find nearby spots, and navigate with ease.",
    iconBg: "var(--m-green)",
  },
  {
    icon: <Gift size={24} strokeWidth={1.8} />,
    title: "100% Free",
    description: "No subscriptions, no hidden paywalls. Every map and itinerary is free to use, forever. Open source and community-driven.",
    iconBg: "var(--m-primary)",
  },
  {
    icon: <Users size={24} strokeWidth={1.8} />,
    title: "Local First",
    description: "Every recommendation comes from people who live there. No sponsored listings, no paid placements. Just honest, local knowledge.",
    iconBg: "var(--m-coral)",
  },
];

export default function FeaturesSection() {
  return (
    <section className="m-section">
      <div className="m-container">
        <SectionHeading
          title="Everything you need to explore any city"
          subtitle="no algorithm noise"
          className="mb-12 md:mb-16"
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <BrutalCard
              key={feature.title}
              hover
              className="h-full"
            >
              <div
                style={{
                  padding: "28px 24px",
                  background: i % 2 === 0 ? "var(--m-bg)" : "#fff",
                }}
              >
                {/* Icon box */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 6,
                    border: "2px solid var(--m-border)",
                    background: feature.iconBg,
                    color: feature.iconBg === "var(--m-accent)" ? "var(--m-text)" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {feature.icon}
                </div>

                <h3
                  style={{
                    fontFamily: "var(--m-font-body)",
                    fontWeight: 700,
                    fontSize: 18,
                    lineHeight: 1.3,
                    color: "var(--m-text)",
                    marginBottom: 8,
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  style={{
                    fontFamily: "var(--m-font-body)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "var(--m-text-muted)",
                    margin: 0,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            </BrutalCard>
          ))}
        </div>
      </div>
    </section>
  );
}
