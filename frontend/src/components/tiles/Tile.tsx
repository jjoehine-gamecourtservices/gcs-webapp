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
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 16,
        padding: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "transform 140ms ease, background 140ms ease, border-color 140ms ease",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.background = "rgba(255,255,255,0.045)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
      }}
    >
      <div
        style={{
          height: 120,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
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
            background: "rgba(255,255,255,0.08)",
          }}
        >
          {icon}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: "18px" }}>{title}</div>
        <div className="dashMuted" style={{ marginTop: 4, lineHeight: "18px" }}>
          {description}
        </div>
      </div>
    </button>
  );
}