import SectionHeading from "@/components/marketing/SectionHeading";
import PostcardFrame from "@/components/marketing/PostcardFrame";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rotation: number;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Used the Mysore map for our weekend trip and discovered amazing cafes and viewpoints we never would have found on Google Maps. Felt like a local.",
    author: "Ananya R.",
    role: "Travel Blogger",
    rotation: -1.5,
  },
  {
    quote:
      "The itineraries are perfect -- no planning needed. Just followed the one-day Goa route and had the best day. The hidden beach recommendation was unreal.",
    author: "Karthik V.",
    role: "Weekend Traveler",
    rotation: 1,
  },
  {
    quote:
      "Finally, a travel guide that doesn't feel like an advertisement. Real places, real recommendations. This is how travel apps should work.",
    author: "Meera S.",
    role: "Solo Traveler",
    rotation: -0.5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="m-section m-section-alt">
      <div className="m-container">
        <SectionHeading
          title="Loved by travelers across India"
          subtitle="real people, real trips"
          className="mb-12 md:mb-16"
        />

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.author}
              style={{
                transform: `rotate(${t.rotation}deg)`,
                transition: "transform 0.2s ease",
              }}
            >
              <PostcardFrame>
                <div style={{ padding: "28px 24px" }}>
                  {/* Quote mark */}
                  <div
                    style={{
                      fontFamily: "var(--m-font-display)",
                      fontSize: 48,
                      lineHeight: 1,
                      color: "var(--m-accent)",
                      marginBottom: 4,
                      userSelect: "none",
                    }}
                  >
                    &ldquo;
                  </div>

                  <p
                    style={{
                      fontFamily: "var(--m-font-body)",
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: "var(--m-text)",
                      marginBottom: 20,
                    }}
                  >
                    {t.quote}
                  </p>

                  {/* Author */}
                  <div
                    style={{
                      borderTop: "2px solid var(--m-border)",
                      paddingTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--m-font-body)",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "var(--m-text)",
                        marginBottom: 2,
                      }}
                    >
                      {t.author}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--m-font-body)",
                        fontSize: 13,
                        color: "var(--m-text-muted)",
                      }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
              </PostcardFrame>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
