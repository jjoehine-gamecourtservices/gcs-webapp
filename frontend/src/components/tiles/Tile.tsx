import React from "react";

export type TileProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export default function Tile({ title, description, icon, disabled, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#1a2745",
        borderRadius: 16,
        padding: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "transform 140ms ease, background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
        color: "rgba(255,255,255,0.95)",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.background = "#223154";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.background = "#1a2745";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          height: 120,
          borderRadius: 12,
          background: "#223154",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "#2a3a60",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {icon}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: "18px", color: "rgba(255,255,255,0.95)" }}>
          {title}
        </div>
        <div className="dashMuted" style={{ marginTop: 4, lineHeight: "18px", color: "rgba(255,255,255,0.72)" }}>
          {description}
        </div>
      </div>
    </button>
  );
}