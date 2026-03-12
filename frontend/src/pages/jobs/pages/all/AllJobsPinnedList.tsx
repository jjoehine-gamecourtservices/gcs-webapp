import React from "react";
import JobsCompactCard from "../../components/JobsCompactCard";
import type { JobListItem } from "../../state/useJobsAll";

type Props = {
  pinnedJobs: JobListItem[];
  prefsLoading: boolean;
  bottomBufferPx: number;
  onOpen: (jobNumber: string) => void;
  onUnpin: (jobNumber: string) => void;
  onMoveUp: (jobNumber: string) => void;
  onMoveDown: (jobNumber: string) => void;
};

export default function AllJobsPinnedList({
  pinnedJobs,
  prefsLoading,
  bottomBufferPx,
  onOpen,
  onUnpin,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <div
      className="jobsPanelScroll jobsPinnedScroll"
      style={{
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        marginRight: 12,
        paddingLeft: 14,
        paddingRight: 14,
        paddingTop: 12,
      }}
    >
      {pinnedJobs.length === 0 ? (
        <div className="dashEmpty">{prefsLoading ? "Loading..." : "No pinned jobs yet."}</div>
      ) : (
        <div className="jobsListStack">
          {pinnedJobs.map((job) => (
            <JobsCompactCard
              key={job.jobNumber}
              job={job}
              onOpen={onOpen}
              onUnpin={onUnpin}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}

      <div aria-hidden="true" style={{ height: bottomBufferPx }} />
    </div>
  );
}