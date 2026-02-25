import React from "react";
import type { UpcomingJob } from "../types";

type Props = {
  job: UpcomingJob;
};

export default function UpcomingJobRow({ job }: Props) {
  const jobId = job.job_number ?? job.id;

  return (
    <div className="dashRow">
      <div className="dashRowStrong">{String(jobId)}</div>
      <div className="dashRowStrong">{job.name}</div>
      <div className="dashMuted">—</div>
      <div className="dashRowStatus">
        <div className="dashRowStrong">—</div>
        <div className="dashMuted"></div>
      </div>
    </div>
  );
}