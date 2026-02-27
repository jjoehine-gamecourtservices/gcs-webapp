import React, { useMemo, useState } from "react";
import useJobsBasic from "../../jobs/state/useJobsBasic";
import JobCard from "../../jobs/components/JobCard";

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

  return (
    <div className="dashCard dashCardFlex">
      <div className="dashCardHead">
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
        <div style={{ display: "grid", gap: 12 }}>
          {top10.length === 0 ? (
            <div className="dashEmpty">{loading ? "Loading jobs…" : "No jobs found."}</div>
          ) : (
            top10.map((j) => <JobCard key={j.id} job={j} onOpen={onOpenJobOverview} />)
          )}
        </div>
      )}
    </div>
  );
}