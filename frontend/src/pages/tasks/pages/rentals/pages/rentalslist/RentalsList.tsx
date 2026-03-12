import React, { useMemo } from "react";
import RentalCard from "../../components/RentalCard";
import type { RentalListItem } from "../../rentals.types";

type Props = {
  rentals: RentalListItem[];
  loading: boolean;
  selectedRentalId: string;
  actionRentalId: string;
  onSelectRental: (rentalId: string) => void;
  onRequestQuote: (rental: RentalListItem) => void;
  onReschedule: (rental: RentalListItem) => void;
  onReserved: (rental: RentalListItem) => void;
  onCancel: (rental: RentalListItem) => void;
  onOnRent: (rental: RentalListItem) => void;
  onOffRent: (rental: RentalListItem) => void;
};

function parseYmdLocal(ymd?: string): Date | null {
  const s = (ymd ?? "").trim();
  if (!s) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;

  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function getStartDateFromRange(dateRange?: string): Date | null {
  const s = (dateRange ?? "").trim();
  if (!s) return null;

  const start = s.split(" - ")[0]?.trim() ?? "";
  return parseYmdLocal(start);
}

function getEndDateFromRange(dateRange?: string): Date | null {
  const s = (dateRange ?? "").trim();
  if (!s) return null;

  const parts = s.split(" - ");
  const end = (parts[1] ?? parts[0] ?? "").trim();
  return parseYmdLocal(end);
}

function normalizeStatus(status?: string): string {
  return (status ?? "").trim().toLowerCase();
}

function isPastRental(rental: RentalListItem): boolean {
  const status = normalizeStatus(rental.status);

  if (status === "off rent") {
    return true;
  }

  const end = getEndDateFromRange(rental.dateRange);
  if (!end) return false;

  return end.getTime() < startOfTodayLocal().getTime();
}

function sortByStartDateAsc(a: RentalListItem, b: RentalListItem): number {
  const aDate = getStartDateFromRange(a.dateRange);
  const bDate = getStartDateFromRange(b.dateRange);

  const aTime = aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER;

  if (aTime !== bTime) return aTime - bTime;
  return (a.jobName || "").localeCompare(b.jobName || "");
}

export default function RentalsList({
  rentals,
  loading,
  selectedRentalId,
  actionRentalId,
  onSelectRental,
  onRequestQuote,
  onReschedule,
  onReserved,
  onCancel,
  onOnRent,
  onOffRent,
}: Props) {
  const { currentRentals, pastRentals } = useMemo(() => {
    const sorted = [...rentals].sort(sortByStartDateAsc);

    return {
      currentRentals: sorted.filter((r) => !isPastRental(r)),
      pastRentals: sorted.filter((r) => isPastRental(r)),
    };
  }, [rentals]);

  return (
    <div
      style={{
        minHeight: 0,
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        padding: 14,
        boxSizing: "border-box",
      }}
    >
      {rentals.length === 0 ? (
        <div className="dashEmpty">{loading ? "Loading..." : "No rentals found."}</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <div className="dashMuted" style={{ paddingLeft: 2 }}>
              Active / Upcoming
            </div>

            {currentRentals.length === 0 ? (
              <div className="dashEmpty">No active or upcoming rentals.</div>
            ) : (
              currentRentals.map((rental) => (
                <div key={rental.id} style={{ width: "100%", minWidth: 0 }}>
                  <RentalCard
                    rental={rental}
                    isSelected={selectedRentalId === rental.id}
                    isActionLoading={actionRentalId === rental.id}
                    onClick={() => onSelectRental(rental.id)}
                    onRequestQuote={() => onRequestQuote(rental)}
                    onReschedule={() => onReschedule(rental)}
                    onReserved={() => onReserved(rental)}
                    onCancel={() => onCancel(rental)}
                    onOnRent={() => onOnRent(rental)}
                    onOffRent={() => onOffRent(rental)}
                  />
                </div>
              ))
            )}
          </div>

          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <div className="dashMuted" style={{ paddingLeft: 2 }}>
              Past / Completed
            </div>

            {pastRentals.length === 0 ? (
              <div className="dashEmpty">No past rentals.</div>
            ) : (
              pastRentals.map((rental) => (
                <div key={rental.id} style={{ width: "100%", minWidth: 0 }}>
                  <RentalCard
                    rental={rental}
                    isSelected={selectedRentalId === rental.id}
                    isActionLoading={actionRentalId === rental.id}
                    onClick={() => onSelectRental(rental.id)}
                    onRequestQuote={() => onRequestQuote(rental)}
                    onReschedule={() => onReschedule(rental)}
                    onReserved={() => onReserved(rental)}
                    onCancel={() => onCancel(rental)}
                    onOnRent={() => onOnRent(rental)}
                    onOffRent={() => onOffRent(rental)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}