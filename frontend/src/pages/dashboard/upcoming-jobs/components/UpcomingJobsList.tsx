import React from "react";
import type { UpcomingJob } from "../types";
import UpcomingJobRow from "./UpcomingJobRow";

type Props = {
  jobs: UpcomingJob[];
};

export default function UpcomingJobsList({ jobs }: Props) {
  return (
    <div className="dashTable">
      <div className="dashTableHeader">
        <div>Job</div>
        <div>Name</div>
        <div>Client</div>
        <div>Status</div>
      </div>

      <div className="dashTableBody" role="region" aria-label="Jobs list">
        {jobs.length === 0 ? (
          <div className="dashEmpty">No jobs to show.</div>
        ) : (
          jobs.map((j) => <UpcomingJobRow key={`${j.id}`} job={j} />)
        )}
      </div>
    </div>
  );
}