"use client";

interface PropControlProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function PropControl({
  label,
  options,
  value,
  onChange,
}: PropControlProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: "var(--m-font-body)",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--m-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            style={{
              padding: "4px 12px",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "var(--m-font-body)",
              border: "2px solid var(--m-border)",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: value === option ? "var(--m-primary)" : "var(--m-bg)",
              color: value === option ? "#fff" : "var(--m-text)",
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
