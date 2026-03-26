import React from "react";

type Props = {
  open: boolean;
  label?: string;
  progress: number;
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export default function LoadingProgressOverlay({
  open,
  label = "Loading...",
  progress,
}: Props) {
  if (!open) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.38)",
        zIndex: 1200,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 20,
          width: "min(33vw, 560px)",
          minWidth: 320,
          maxWidth: "calc(100vw - 48px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(16, 26, 51, 0.96)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          padding: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.92)",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {label}
        </div>

        <div
          style={{
            width: "100%",
            height: 16,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${clampProgress(progress)}%`,
              height: "100%",
              borderRadius: 999,
              background: "#22c55e",
              transition: "width 140ms linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}