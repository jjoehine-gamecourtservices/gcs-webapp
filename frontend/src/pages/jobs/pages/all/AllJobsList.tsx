import React from "react";
import JobsListCard from "../../components/JobsListCard";
import type { JobListItem } from "../../state/useJobsAll";

type Props = {
  jobs: JobListItem[];
  loading: boolean;
  bottomBufferPx: number;
  onOpen: (jobNumber: string) => void;
  onPin: (jobNumber: string) => void;
};

export default function AllJobsList({
  jobs,
  loading,
  bottomBufferPx,
  onOpen,
  onPin,
}: Props) {
  return (
    <div
      className="jobsPanelScroll jobsListScroll"
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
      {loading ? (
        <div className="dashEmpty">Loading jobs...</div>
      ) : (
        <div className="jobsListStack">
          {jobs.map((job) => (
            <JobsListCard key={job.jobNumber} job={job} onOpen={onOpen} onPin={onPin} />
          ))}
        </div>
      )}

      <div aria-hidden="true" style={{ height: bottomBufferPx }} />
    </div>
  );
}