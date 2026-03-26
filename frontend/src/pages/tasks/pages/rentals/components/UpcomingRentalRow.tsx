import React, { useMemo } from "react";
import type { RentalListItem } from "../rentals.types";

type Props = {
  rental: RentalListItem;
};

function normalizeDisplay(value?: string): string {
  const v = (value ?? "").trim();
  return v || "-";
}

function formatDateMmDdYyyy(value?: string): string {
  const raw = (value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw || "-";

  const [, year, month, day] = match;
  return `${month}-${day}-${year}`;
}

function formatDateRange(value?: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "-";

  const parts = raw.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${formatDateMmDdYyyy(parts[0])} - ${formatDateMmDdYyyy(parts[1])}`;
  }

  return formatDateMmDdYyyy(raw);
}

function getStatusPillClass(status: string): string {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized === "reserved") return "upcomingRentalPill upcomingRentalPillReserved";
  if (normalized === "on rent") return "upcomingRentalPill upcomingRentalPillOnRent";
  if (normalized === "off rent") return "upcomingRentalPill upcomingRentalPillOffRent";
  if (normalized === "cancelled") return "upcomingRentalPill upcomingRentalPillCancelled";
  if (normalized === "not yet reserved") return "upcomingRentalPill upcomingRentalPillDefault";

  return "upcomingRentalPill upcomingRentalPillDefault";
}

export default function UpcomingRentalRow({ rental }: Props) {
  const titleLine = useMemo(() => {
    const name = (rental.jobName ?? "").trim();
    const num = (rental.jobNumber ?? "").trim();
    if (!name) return num || "-";
    if (!num) return name;
    return `${name} - ${num}`;
  }, [rental.jobName, rental.jobNumber]);

  const dateRange = useMemo(() => formatDateRange(rental.dateRange), [rental.dateRange]);
  const status = useMemo(() => normalizeDisplay(rental.status), [rental.status]);

  return (
    <div className="upcomingRentalRow">
      <div className="upcomingRentalTitle">{titleLine}</div>

      <div className="upcomingRentalRight">
        <div className="upcomingRentalPill upcomingRentalPillDefault">{dateRange}</div>
        <div className="upcomingRentalDivider" aria-hidden="true" />
        <div className={getStatusPillClass(status)}>{status}</div>
      </div>
    </div>
  );
}