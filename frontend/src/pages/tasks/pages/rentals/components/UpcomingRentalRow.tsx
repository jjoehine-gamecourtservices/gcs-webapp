import React, { useMemo } from "react";
import type { RentalListItem } from "../rentals.types";

type Props = {
  rental: RentalListItem;
};

function normalizeDisplay(value?: string): string {
  const v = (value ?? "").trim();
  return v || "-";
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

  const dateRange = useMemo(() => normalizeDisplay(rental.dateRange), [rental.dateRange]);
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