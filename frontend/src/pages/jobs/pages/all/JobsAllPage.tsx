import React, { useMemo } from "react";
import useJobsBasic from "../../state/useJobsBasic";
import JobCard from "../../components/JobCard";

type Props = {
  onOpenOverview: (jobId: string) => void;
};

export default function JobsAllPage({ onOpenOverview }: Props) {
  const { jobs, loading, error, reload } = useJobsBasic();

  const cards = useMemo(() => jobs, [jobs]);

  return (
    <div className="dashCard dashCardFlex">
      <div className="dashCardHead">
        <div>
          <div className="dashCardTitle">Jobs</div>
          <div className="dashMuted">
            {loading ? "Loading…" : error ? "Failed to load jobs." : "All jobs from Monday."}
          </div>
        </div>

        <div className="dashFilters">
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
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((j) => (
            <JobCard key={j.id} job={j} onOpen={onOpenOverview} />
          ))}
        </div>
      )}
    </div>
  );
}