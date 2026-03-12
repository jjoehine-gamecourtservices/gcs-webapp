import React, { useMemo, useState } from "react";
import NewRentalRequestPage from "./pages/newrentalrequest/NewRentalRequestPage";
import RentalsListPage from "./pages/rentalslist/RentalsListPage";
import type { RentalListItem } from "./rentals.types";
import UpcomingRentalRow from "./components/UpcomingRentalRow";
import useRentals from "./state/useRentals";

type ViewState =
  | { id: "home" }
  | { id: "rentals-list" }
  | { id: "new-rental-request" };

function RentalsTile({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="tasksTile" onClick={onClick}>
      <div className="tasksTileIconArea">
        <div className="tasksTileIcon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8.25C4 7.007 5.007 6 6.25 6h11.5C18.993 6 20 7.007 20 8.25v6.5C20 15.993 18.993 17 17.75 17H6.25C5.007 17 4 15.993 4 14.75v-6.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M7 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8 17v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 17v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="tasksTileTitle">{title}</div>
      </div>
    </button>
  );
}

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

function isUpcomingOrActiveRental(rental: RentalListItem): boolean {
  const end = getEndDateFromRange(rental.dateRange);
  if (!end) return true;
  return end.getTime() >= startOfTodayLocal().getTime();
}

function sortByStartDateAsc(a: RentalListItem, b: RentalListItem): number {
  const aDate = getStartDateFromRange(a.dateRange);
  const bDate = getStartDateFromRange(b.dateRange);

  const aTime = aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER;

  if (aTime !== bTime) return aTime - bTime;
  return (a.jobName || "").localeCompare(b.jobName || "");
}

export default function RentalsPage() {
  const [view, setView] = useState<ViewState>({ id: "home" });
  const { rentals, loading, refreshing, reload } = useRentals();

  const upcomingRentals = useMemo(() => {
    return rentals.filter(isUpcomingOrActiveRental).sort(sortByStartDateAsc);
  }, [rentals]);

  if (view.id === "rentals-list") {
    return <RentalsListPage />;
  }

  if (view.id === "new-rental-request") {
    return <NewRentalRequestPage />;
  }

  return (
    <section className="tasksWorkspace rentalsWorkspace">
      <div className="rentalsNav">
        <RentalsTile
          title="Rentals"
          onClick={() => setView({ id: "rentals-list" })}
        />

        <RentalsTile
          title="New Rental Request"
          onClick={() => setView({ id: "new-rental-request" })}
        />
      </div>

      <section className="rentalsUpcomingPanel">
        <div className="rentalsUpcomingHeader">
          <div>Upcoming Rentals</div>

          <button
            type="button"
            className="dashMiniPill rentalsRefreshButton"
            onClick={() => {
              void reload();
            }}
            style={{ cursor: refreshing ? "wait" : "pointer" }}
            title="Refresh rentals"
            disabled={refreshing}
          >
            {refreshing ? <span className="rentalsRefreshSpinner" aria-hidden="true" /> : null}
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        <div className="rentalsUpcomingBody rentalsUpcomingBodyList">
          {upcomingRentals.length === 0 ? (
            <div className="dashMuted">{loading ? "Loading..." : "No upcoming rentals."}</div>
          ) : (
            <div className="upcomingRentalList">
              {upcomingRentals.map((rental) => (
                <UpcomingRentalRow key={rental.id} rental={rental} />
              ))}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}