import React, { useMemo, useState } from "react";
import useJobsBasic from "../../jobs/state/useJobsBasic";
import UpcomingJobsList from "./UpcomingJobsList";

type Props = {
  onViewAllJobs: () => void;
  onOpenJobOverview: (jobId: string) => void;
};

export default function UpcomingJobsSection({ onViewAllJobs, onOpenJobOverview }: Props) {
  const { jobs, loading, refreshing, error, reload } = useJobsBasic();
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

  const bottomBufferPx = 14;

  return (
    <div
      className="dashCard dashCardFlex"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        padding: 0,
      }}
    >
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
        </div>

        <div className="dashFilters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="dashInput"
            aria-label="Search jobs"
          />

          <button
            type="button"
            className="dashMiniPill jobsRefreshButton"
            onClick={() => {
              void reload();
            }}
            style={{ cursor: refreshing ? "wait" : "pointer" }}
            title="Refresh jobs"
            disabled={refreshing}
          >
            {refreshing ? <span className="jobsRefreshSpinner" aria-hidden="true" /> : null}
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="dashMiniPill jobsActionButton"
            onClick={onViewAllJobs}
            title="View all jobs"
          >
            <span>View all</span>
          </button>
        </div>
      </div>

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          marginRight: 12,
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