import React, { useMemo } from "react";

type Props = {
  status: string;
  onRequestQuote?: () => void;
  onReserved?: () => void;
  onOnRent?: () => void;
  onCancel?: () => void;
  onOffRent?: () => void;
  onReschedule?: () => void;
};

type ButtonDef = {
  key: string;
  label: string;
  onClick?: () => void;
};

function normalizeStatus(status: string): string {
  return (status ?? "").trim().toLowerCase();
}

function ActionButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="dashMiniPill"
      style={{
        cursor: "pointer",
        width: "100%",
        minHeight: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "rgba(255,255,255,0.92)",   // force white text
        fontWeight: 600,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      {label}
    </button>
  );
}

export default function RentalStatusButtons({
  status,
  onRequestQuote,
  onReserved,
  onOnRent,
  onCancel,
  onOffRent,
  onReschedule,
}: Props) {
  const buttons = useMemo<ButtonDef[]>(() => {
    const normalized = normalizeStatus(status);

    if (normalized === "not yet reserved") {
      return [
        { key: "request-quote", label: "Request Quote", onClick: onRequestQuote },
        { key: "reserved", label: "Reserved", onClick: onReserved },
      ];
    }

    if (normalized === "reserved") {
      return [
        { key: "on-rent", label: "On Rent", onClick: onOnRent },
        { key: "cancel", label: "Cancel", onClick: onCancel },
      ];
    }

    if (normalized === "on rent") {
      return [{ key: "off-rent", label: "Off Rent", onClick: onOffRent }];
    }

    if (normalized === "cancelled") {
      return [
        { key: "reschedule", label: "Reschedule", onClick: onReschedule },
        { key: "reserved", label: "Reserved", onClick: onReserved },
      ];
    }

    return [];
  }, [status, onRequestQuote, onReserved, onOnRent, onCancel, onOffRent, onReschedule]);

  if (buttons.length === 0) {
    return <div style={{ minHeight: 0 }} />;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        alignSelf: "start",
      }}
    >
      {buttons.map((button) => (
        <ActionButton key={button.key} label={button.label} onClick={button.onClick} />
      ))}
    </div>
  );
}