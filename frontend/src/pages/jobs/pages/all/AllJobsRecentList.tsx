import React from "react";
import JobsRecentCard from "../../components/JobsRecentCard";
import type { JobListItem } from "../../state/useJobsAll";

type Props = {
  recentJobs: JobListItem[];
  prefsLoading: boolean;
  onOpen: (jobNumber: string) => void;
  onRemove: (jobNumber: string) => void;
  onPin: (jobNumber: string) => void;
};

export default function AllJobsRecentList({
  recentJobs,
  prefsLoading,
  onOpen,
  onRemove,
  onPin,
}: Props) {
  if (recentJobs.length === 0) {
    return (
      <div className="jobsRecentEmptyTile">
        <div className="jobsRecentEmptyContent">
          <div className="dashCardTitle">Recent Jobs</div>
          <div className="dashMuted">
            {prefsLoading ? "Loading..." : "Open a job to see it here"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {recentJobs.map((job) => (
        <div key={job.jobNumber} className="jobsRecentTileWrap">
          <JobsRecentCard
            job={job}
            onOpen={onOpen}
            onRemove={onRemove}
            onPin={onPin}
          />
        </div>
      ))}
    </>
  );
}