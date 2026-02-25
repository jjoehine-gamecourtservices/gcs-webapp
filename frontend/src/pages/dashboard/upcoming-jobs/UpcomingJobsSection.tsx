import React, { useMemo, useState } from "react";
import useUpcomingJobs from "./useUpcomingJobs";
import UpcomingJobsList from "./components/UpcomingJobsList";
import type { UpcomingJob } from "./types";

export default function UpcomingJobsSection() {
  const { jobs, loading, error, reload } = useUpcomingJobs();

  const [search, setSearch] = useState("");
  const [statusFilter] = useState<string>("All"); // reserved for later

  const filteredJobs = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return jobs;

    return jobs.filter((j: UpcomingJob) => {
      const idStr = String(j.job_number ?? j.id).toLowerCase();
      const nameStr = (j.name ?? "").toLowerCase();
      return idStr.includes(s) || nameStr.includes(s);
    });
  }, [jobs, search]);

  return (
    <div className="dashCard dashCardFlex">
      <div className="dashCardHead">
        <div>
          <div className="dashCardTitle">Upcoming Jobs</div>
          <div className="dashMuted">
            {loading
              ? "Loading from Monday.com…"
              : error
              ? "Failed to load from Monday.com."
              : "Loaded from Monday.com."}
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

          <select
            value={statusFilter}
            onChange={() => {}}
            className="dashSelect"
            aria-label="Filter by status"
            disabled
            title="Status filtering will be enabled once status is included in the Monday response."
          >
            <option value="All">All</option>
          </select>

          <button className="dashBtn" onClick={reload} type="button">
            Refresh
          </button>
        </div>
      </div>

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
        <UpcomingJobsList jobs={filteredJobs} />
      )}
    </div>
  );
}