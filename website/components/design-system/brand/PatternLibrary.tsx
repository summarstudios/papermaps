const patterns: PatternItem[] = [
  {
    name: "Crosshatch",
    desc: "Classic pen crosshatching — shading and texture",
    css: {
      backgroundImage: `repeating-linear-gradient(
        45deg, transparent, transparent 4px,
        rgba(45, 41, 38, 0.08) 4px, rgba(45, 41, 38, 0.08) 5px
      ), repeating-linear-gradient(
        -45deg, transparent, transparent 4px,
        rgba(45, 41, 38, 0.08) 4px, rgba(45, 41, 38, 0.08) 5px
      )`,
    },
  },
  {
    name: "Dot Grid",
    desc: "Notebook dots — subtle structure without rigidity",
    css: {
      backgroundImage: "radial-gradient(circle, rgba(45, 41, 38, 0.15) 1px, transparent 1px)",
      backgroundSize: "16px 16px",
    },
  },
  {
    name: "Contour Lines",
    desc: "Topographic contours — elevation and terrain",
    svgContent: (
      <svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
        <path d="M 0,100 C 40,90 60,70 100,65 C 140,60 160,70 200,60" fill="none" stroke="rgba(45,41,38,0.1)" strokeWidth="1.5" />
        <path d="M 0,80 C 40,68 65,50 100,45 C 135,40 165,50 200,42" fill="none" stroke="rgba(45,41,38,0.1)" strokeWidth="1.5" />
        <path d="M 0,60 C 45,48 70,30 105,28 C 140,26 165,34 200,28" fill="none" stroke="rgba(45,41,38,0.1)" strokeWidth="1.5" />
        <path d="M 0,42 C 50,30 75,16 110,14 C 145,12 170,20 200,16" fill="none" stroke="rgba(45,41,38,0.1)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: "Stipple",
    desc: "Ink stippling — organic, noisy texture",
    css: {
      backgroundImage: `radial-gradient(circle, rgba(45, 41, 38, 0.12) 0.8px, transparent 0.8px),
        radial-gradient(circle, rgba(45, 41, 38, 0.08) 0.6px, transparent 0.6px)`,
      backgroundSize: "12px 12px, 7px 7px",
      backgroundPosition: "0 0, 4px 4px",
    },
  },
  {
    name: "Graph Paper",
    desc: "Engineering grid — precision meets hand-drawn",
    css: {
      backgroundImage: `linear-gradient(rgba(45, 41, 38, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(45, 41, 38, 0.06) 1px, transparent 1px),
        linear-gradient(rgba(45, 41, 38, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(45, 41, 38, 0.03) 1px, transparent 1px)`,
      backgroundSize: "48px 48px, 48px 48px, 12px 12px, 12px 12px",
    },
  },
  {
    name: "Ruled Lines",
    desc: "Notebook ruled — for text-heavy sections",
    css: {
      backgroundImage: `repeating-linear-gradient(
        0deg, transparent, transparent 27px,
        rgba(45, 41, 38, 0.08) 27px, rgba(45, 41, 38, 0.08) 28px
      )`,
    },
  },
];

interface PatternItem {
  name: string;
  desc: string;
  css?: React.CSSProperties;
  svgContent?: React.ReactNode;
}

const mapIcons = [
  {
    label: "Food",
    color: "#C4663A",
    paths: (
      <>
        <path d="M 10,8 L 10,24" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M 10,8 C 10,14 16,14 16,8" stroke="#C4663A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 22,8 L 22,14 C 22,18 20,18 20,14 L 20,8" stroke="#C4663A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 21,14 L 21,24" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Coffee",
    color: "#4A7FB5",
    paths: (
      <>
        <path d="M 8,12 L 8,22 C 8,24 10,26 16,26 C 22,26 24,24 24,22 L 24,12 Z" stroke="#4A7FB5" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 24,14 C 26,14 28,16 28,18 C 28,20 26,22 24,22" stroke="#4A7FB5" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 12,8 C 12,6 14,6 14,8" stroke="#4A7FB5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 16,6 C 16,4 18,4 18,6" stroke="#4A7FB5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Temple",
    color: "#E8B84B",
    paths: (
      <>
        <path d="M 16,6 L 8,16 L 24,16 Z" stroke="#E8B84B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 10,16 L 10,26 L 22,26 L 22,16" stroke="#E8B84B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 14,26 L 14,20 L 18,20 L 18,26" stroke="#E8B84B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Park",
    color: "#5B8C5A",
    paths: (
      <>
        <path d="M 16,24 L 16,14" stroke="#5B8C5A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 16,6 C 10,6 8,10 8,13 C 8,17 12,18 16,18 C 20,18 24,17 24,13 C 24,10 22,6 16,6 Z" stroke="#5B8C5A" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Market",
    color: "#C4663A",
    paths: (
      <>
        <path d="M 6,14 L 26,14" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 8,14 L 8,24" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 24,14 L 24,24" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 6,14 L 10,8 L 22,8 L 26,14" stroke="#C4663A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 8,24 L 24,24" stroke="#C4663A" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Hotel",
    color: "#3D5A99",
    paths: (
      <>
        <path d="M 8,24 L 8,10 L 24,10 L 24,24" stroke="#3D5A99" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 6,24 L 26,24" stroke="#3D5A99" strokeWidth="2" strokeLinecap="round" />
        <path d="M 14,24 L 14,18 L 18,18 L 18,24" stroke="#3D5A99" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 11,14 L 13,14" stroke="#3D5A99" strokeWidth="2" strokeLinecap="round" />
        <path d="M 19,14 L 21,14" stroke="#3D5A99" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Camera",
    color: "#C75B7A",
    paths: (
      <>
        <path d="M 6,12 L 26,12 L 26,24 L 6,24 Z" stroke="#C75B7A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="18" r="4" stroke="#C75B7A" strokeWidth="2" fill="none" />
        <path d="M 11,12 L 13,8 L 19,8 L 21,12" stroke="#C75B7A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Music",
    color: "#E8B84B",
    paths: (
      <>
        <path d="M 12,24 C 12,26 8,26 8,24 C 8,22 12,22 12,24" stroke="#E8B84B" strokeWidth="2" fill="none" />
        <path d="M 24,22 C 24,24 20,24 20,22 C 20,20 24,20 24,22" stroke="#E8B84B" strokeWidth="2" fill="none" />
        <path d="M 12,24 L 12,10 L 24,8 L 24,22" stroke="#E8B84B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

export default function PatternLibrary() {
  return (
    <div style={{ marginTop: 24 }}>
      {/* Pattern tiles */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 20,
      }}>
        {patterns.map((p) => (
          <div
            key={p.name}
            style={{
              border: "1.5px solid #8B7D6B",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#FFF9F0",
            }}
          >
            <div style={{
              height: 120,
              background: "#FDF6EC",
              position: "relative",
              overflow: "hidden",
              ...(p.css ?? {}),
            }}>
              {p.svgContent && (
                <div style={{ position: "absolute", inset: 0 }}>
                  {p.svgContent}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 18px", borderTop: "1.5px solid #8B7D6B" }}>
              <p style={{
                fontFamily: "Fraunces, serif",
                fontSize: 16,
                fontWeight: 600,
                color: "#2D2926",
                marginBottom: 4,
              }}>
                {p.name}
              </p>
              <p style={{ fontFamily: "Kalam, cursive", fontSize: 14, color: "#6B6560" }}>
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Map Icons */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{
          fontFamily: "Fraunces, serif",
          fontSize: 22,
          fontWeight: 600,
          color: "#2D2926",
          marginBottom: 4,
        }}>
          Map Icons
        </h3>
        <p style={{
          fontFamily: "Kalam, cursive",
          fontSize: 16,
          color: "#6B6560",
          marginBottom: 20,
        }}>
          Hand-drawn icons for map markers and UI
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {mapIcons.map((icon) => (
            <div key={icon.label} style={{ width: 80, textAlign: "center" }}>
              <div style={{
                width: 64,
                height: 64,
                margin: "0 auto 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${icon.color}`,
                borderRadius: "50%",
                background: "#FFF9F0",
              }}>
                <svg viewBox="0 0 32 32" width="28" height="28">
                  {icon.paths}
                </svg>
              </div>
              <p style={{ fontFamily: "Kalam, cursive", fontSize: 13, color: "#6B6560" }}>
                {icon.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
