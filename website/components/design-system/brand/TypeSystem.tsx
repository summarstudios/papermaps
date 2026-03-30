const fonts = [
  {
    name: "Kalam",
    role: "Handwritten / Annotations",
    family: "Kalam, cursive",
    desc: "The signature Paper Maps font. Rooted in Indian type design heritage, Kalam brings a warm, natural handwriting feel to labels, annotations, and anything that should feel personally written on a map.",
    specimens: [
      { size: 48, weight: 700, text: "Explore like a local" },
      { size: 32, weight: 700, text: "Hidden gem near the old fort wall" },
      { size: 20, weight: 400, text: "Best chai in the neighborhood — trust me, I've tried them all. The owner knows everyone by name." },
    ],
  },
  {
    name: "Fraunces",
    role: "Display / Headings",
    family: "Fraunces, serif",
    desc: "Elegant serif with optical sizing and wonky alternates. Gives authority and warmth to headings.",
    specimens: [
      { size: 48, weight: 700, text: "Mysore Palace Quarter" },
      { size: 32, weight: 600, text: "Where the Streets Have Stories" },
      { size: 20, weight: 400, text: "Every city has its own rhythm. Paper Maps helps you find the beat — the morning market, the sunset viewpoint, the street that comes alive after dark." },
    ],
  },
  {
    name: "DM Sans",
    role: "Body / UI",
    family: "var(--m-font-body, DM Sans, sans-serif)",
    desc: "Clean, highly legible sans-serif for body text and interface elements. Stays out of the way.",
    specimens: [
      { size: 18, weight: 700, text: "Curated travel maps for curious explorers" },
      { size: 16, weight: 400, text: "Paper Maps is a collection of hand-curated city maps designed for travelers who want to go beyond the tourist trail. Each map is crafted by locals who know the hidden corners, the best food stalls, and the quiet parks." },
      { size: 14, weight: 400, text: "Open Mon-Sat · 8am-6pm · ₹200 average · Vegetarian friendly" },
    ],
  },
];

export default function TypeSystem() {
  return (
    <div style={{ marginTop: 24 }}>
      {fonts.map((font, i) => (
        <div
          key={font.name}
          style={{
            marginBottom: i < fonts.length - 1 ? 48 : 0,
            border: "1.5px solid #8B7D6B",
            borderRadius: "12px",
            overflow: "hidden",
            background: "#FFF9F0",
          }}
        >
          {/* Header bar */}
          <div style={{
            padding: "16px 24px",
            borderBottom: "1.5px solid #8B7D6B",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 8,
          }}>
            <span style={{
              fontFamily: font.family,
              fontSize: 24,
              fontWeight: 700,
              color: "#2D2926",
            }}>
              {font.name}
            </span>
            <span style={{
              fontFamily: "Kalam, cursive",
              fontSize: 16,
              color: "#C4663A",
            }}>
              {font.role}
            </span>
          </div>

          {/* Description */}
          <div style={{ padding: "16px 24px", borderBottom: "1px dashed rgba(45,41,38,0.2)" }}>
            <p style={{
              fontFamily: "var(--m-font-body, DM Sans, sans-serif)",
              fontSize: 14,
              color: "#6B6560",
              lineHeight: 1.6,
            }}>
              {font.desc}
            </p>
          </div>

          {/* Specimens */}
          <div style={{ padding: 24 }}>
            {font.specimens.map((spec, j) => (
              <div
                key={j}
                style={{
                  marginBottom: j < font.specimens.length - 1 ? 24 : 0,
                  paddingBottom: j < font.specimens.length - 1 ? 24 : 0,
                  borderBottom: j < font.specimens.length - 1 ? "1px dashed rgba(45,41,38,0.15)" : "none",
                }}
              >
                <span style={{
                  fontFamily: "Kalam, cursive",
                  fontSize: 12,
                  color: "#A39E99",
                  display: "block",
                  marginBottom: 8,
                }}>
                  {spec.size}px · weight {spec.weight}
                </span>
                <p style={{
                  fontFamily: font.family,
                  fontSize: spec.size,
                  fontWeight: spec.weight,
                  color: "#2D2926",
                  lineHeight: spec.size > 30 ? 1.2 : 1.6,
                  margin: 0,
                }}>
                  {spec.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
