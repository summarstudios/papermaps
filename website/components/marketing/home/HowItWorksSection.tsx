import SectionHeading from "@/components/marketing/SectionHeading";

interface Step {
  number: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Pick a City",
    description:
      "Browse our growing collection of curated city maps. From Mysore to Goa, find the destination you are heading to.",
  },
  {
    number: "02",
    title: "Explore the Map",
    description:
      "Discover hand-picked cafes, temples, viewpoints, and hidden gems placed on a beautiful interactive map.",
  },
  {
    number: "03",
    title: "Travel Like a Local",
    description:
      "Follow ready-made itineraries or build your own. Navigate on your phone and enjoy the city like someone who lives there.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="m-section m-section-alt">
      <div className="m-container">
        <SectionHeading
          title="Three steps to your best trip"
          subtitle="it's that simple"
          className="mb-12 md:mb-16"
        />

        <div className="grid md:grid-cols-3 gap-8 md:gap-0" style={{ position: "relative" }}>
          {/* Dashed connector line (desktop only) */}
          <div
            className="hidden md:block"
            style={{
              position: "absolute",
              top: 52,
              left: "20%",
              right: "20%",
              height: 0,
              borderTop: "3px dashed var(--m-border)",
              opacity: 0.25,
              zIndex: 0,
            }}
          />

          {steps.map((step, i) => (
            <div
              key={step.number}
              style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                padding: "0 16px",
              }}
            >
              {/* Step number */}
              <div
                style={{
                  fontFamily: "var(--m-font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(56px, 8vw, 80px)",
                  lineHeight: 1,
                  color: "var(--m-text)",
                  opacity: 0.08,
                  marginBottom: -20,
                  position: "relative",
                  zIndex: 0,
                }}
              >
                {step.number}
              </div>

              {/* Step dot */}
              <div
                className="hidden md:flex"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "3px solid var(--m-border)",
                  background: i === 0 ? "var(--m-accent)" : i === 1 ? "var(--m-primary)" : "var(--m-coral)",
                  margin: "0 auto 20px",
                  position: "relative",
                  zIndex: 2,
                }}
              />

              <h3
                style={{
                  fontFamily: "var(--m-font-display)",
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1.2,
                  color: "var(--m-text)",
                  marginBottom: 10,
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  fontFamily: "var(--m-font-body)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--m-text-muted)",
                  maxWidth: 300,
                  margin: "0 auto",
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
