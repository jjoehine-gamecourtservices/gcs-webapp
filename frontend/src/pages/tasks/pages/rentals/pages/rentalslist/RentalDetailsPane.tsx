import React, { useMemo } from "react";
import type { RentalListItem } from "../../rentals.types";

type Props = {
  rental: RentalListItem | null;
};

function normalizeDisplay(value?: string): string {
  const v = (value ?? "").trim();
  return v || "-";
}

function formatPhone(value?: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function joinNamePhone(name?: string, phone?: string): string {
  const n = (name ?? "").trim();
  const p = formatPhone(phone);
  if (!n && !p) return "-";
  if (n && !p) return n;
  if (!n && p) return p;
  return `${n} - ${p}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.82)" }}>{label}:</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: "18px", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}

export default function RentalDetailsPane({ rental }: Props) {
  const title = useMemo(() => {
    if (!rental) return "Select a rental";
    const name = (rental.jobName ?? "").trim();
    const num = (rental.jobNumber ?? "").trim();
    if (!name) return num || "Rental Details";
    if (!num) return name;
    return `${name} - ${num}`;
  }, [rental]);

  if (!rental) {
    return (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          overflowY: "auto",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div className="dashMuted">Select a rental card to view details.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        padding: 16,
        boxSizing: "border-box",
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>{title}</div>
        <div className="dashMuted">{normalizeDisplay(rental.address)}</div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        }}
      >
        <DetailRow label="PM" value={normalizeDisplay(rental.pm)} />
        <DetailRow label="Date Range" value={normalizeDisplay(rental.dateRange)} />
        <DetailRow label="Status" value={normalizeDisplay(rental.status)} />
        <DetailRow label="Equipment Type" value={normalizeDisplay(rental.equipmentType)} />
        <DetailRow label="Size" value={normalizeDisplay(rental.size)} />
        <DetailRow label="Accessories" value={normalizeDisplay(rental.accessories)} />
        <DetailRow label="Drivetrain" value={normalizeDisplay(rental.drivetrain)} />
        <DetailRow label="Delivery Time" value={normalizeDisplay(rental.deliveryTime)} />
        <DetailRow label="Company" value={joinNamePhone(rental.company, rental.companyCellContact)} />
        <DetailRow label="Delivery Contact" value={joinNamePhone(rental.deliveryContact, rental.deliveryCellContact)} />
        <DetailRow label="Budget" value={normalizeDisplay(rental.budget)} />
        <DetailRow label="Notes" value={normalizeDisplay(rental.notes)} />
      </div>
    </div>
  );
}