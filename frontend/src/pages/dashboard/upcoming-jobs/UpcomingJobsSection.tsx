import React, { useMemo, useState } from "react";
import useJobsBasic from "../../jobs/state/useJobsBasic";
import UpcomingJobsList from "./UpcomingJobsList";

type Props = {
  onViewAllJobs: () => void;
  onOpenJobOverview: (jobId: string) => void;
};

export default function UpcomingJobsSection({ onViewAllJobs, onOpenJobOverview }: Props) {
  const { jobs, loading, error, reload } = useJobsBasic();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter((j) => {
      const num = (j.jobNumber ?? "").toLowerCase();
      const name = (j.jobName ?? "").toLowerCase();
      return num.includes(s) || name.includes(s) || j.id.toLowerCase().includes(s);
    });
  }, [jobs, search]);

  const top10 = useMemo(() => filtered.slice(0, 10), [filtered]);

  // Controls how much "air" you see below the last card when scrolled to bottom.
  const bottomBufferPx = 14;

  return (
    <div
      className="dashCard dashCardFlex"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,

        // IMPORTANT: card is NOT the scroll container anymore
        overflow: "hidden",

        // keep header flush to the top like before
        padding: 0,
      }}
    >
      {/* Header: keep the glass look */}
      <div
        className="dashCardHead"
        style={{
          flex: "0 0 auto",
          position: "relative",
          zIndex: 10,
          background: "rgba(16, 26, 51, 0.72)",
          backdropFilter: "blur(10px)",
          padding: 14,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div className="dashCardTitle">Upcoming Jobs</div>
          <div className="dashMuted">
            {loading ? "Loading…" : error ? "Failed to load from Monday.com." : "Top 10 jobs."}
          </div>
        </div>

        <div className="dashFilters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="dashInput"
            aria-label="Search jobs"
          />
          <button className="dashBtn" onClick={reload} type="button">
            Refresh
          </button>
          <button className="dashBtn" onClick={onViewAllJobs} type="button">
            View all
          </button>
        </div>
      </div>

      {/* Scrollable body ONLY (so scrollbar starts below header) */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,

          overflowY: "auto",
          overflowX: "hidden",

          // Inset the scrollbar off the card edge (moves the scroll container left)
          marginRight: 12,

          // Keep content aligned with header padding
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 12,
        }}
      >
        {error ? (
          <div className="dashEmpty">
            {error}
            <div style={{ marginTop: 8 }}>
              <button className="dashBtn" onClick={reload} type="button">
                Try again
              </button>
            </div>
          </div>
        ) : (
          <UpcomingJobsList jobs={top10} onOpenJobOverview={onOpenJobOverview} loading={loading} />
        )}

        <div aria-hidden="true" style={{ height: bottomBufferPx }} />
      </div>
    </div>
  );
}