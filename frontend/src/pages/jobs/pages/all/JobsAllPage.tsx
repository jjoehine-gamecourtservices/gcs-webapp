import React from "react";
import useJobsAll from "../../state/useJobsAll";
import JobsListCard from "../../components/JobsListCard";

type Props = {
  onOpenOverview: (jobId: string) => void;
};

export default function JobsAllPage({ onOpenOverview }: Props) {
  const { jobs, loading } = useJobsAll();

  const hasRecent = false; // wiring later

  return (
    <div className="jobsPageRoot" aria-label="Jobs Page">
      {/* RECENT JOBS (full width) */}
      <section className="dashCard jobsSection" aria-label="Recent Jobs">
        <div className="dashCardHead">
          <div>
            <div className="dashCardTitle">Recent Jobs</div>
            <div className="dashMuted">Open a job to see it here</div>
          </div>
        </div>

        <div className="jobsRecentScrollTop" role="region" aria-label="Recent Jobs Scroller">
          <div className="jobsRecentInner">
            {hasRecent ? null : (
              <div className="jobsRecentEmptyTile">
                <div className="dashMuted">No recent jobs yet.</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PINNED + JOB LIST */}
      <div className="jobsGrid" aria-label="Pinned and Jobs List">
        {/* PINNED JOBS */}
        <section className="dashCard dashCardFlex jobsSection" aria-label="Pinned Jobs">
          <div className="dashCardHead">
            <div>
              <div className="dashCardTitle">Pinned Jobs</div>
              <div className="dashMuted">Add jobs to your pin list</div>
            </div>
          </div>

          <div className="jobsScrollY jobsScrollYHover" role="region" aria-label="Pinned Jobs List">
            <div className="dashMuted" style={{ padding: 12 }}>
              No pinned jobs yet.
            </div>
          </div>
        </section>

        {/* JOBS LIST */}
        <section className="dashCard dashCardFlex jobsSection" aria-label="Jobs List">
          <div className="dashCardHead">
            <div>
              <div className="dashCardTitle">Jobs</div>
              <div className="dashMuted">All jobs</div>
            </div>

            <div className="dashFilters">
              <input className="dashInput" placeholder="Search job or number" type="text" />
              <select className="dashSelect" disabled>
                <option>Filters (soon)</option>
              </select>
            </div>
          </div>

          <div className="jobsScrollY jobsScrollYHover" role="region" aria-label="All Jobs List">
            {loading ? (
              <div className="dashMuted" style={{ padding: 12 }}>
                Loading jobs...
              </div>
            ) : (
              <div className="jobsListStack">
                {jobs.map((j) => (
                  <JobsListCard key={j.jobNumber} job={j} onOpen={onOpenOverview} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}