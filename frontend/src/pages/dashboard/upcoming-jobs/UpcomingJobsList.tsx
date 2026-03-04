import React from "react";
import JobCard from "../../jobs/components/JobCard";
import type { JobCardModel } from "../../jobs/jobs.types";

type Props = {
  jobs: JobCardModel[];
  onOpenJobOverview: (jobId: string) => void;
  loading?: boolean;
};

export default function UpcomingJobsList({ jobs, onOpenJobOverview, loading }: Props) {
  if (!jobs || jobs.length === 0) {
    return <div className="dashEmpty">{loading ? "Loading jobs…" : "No jobs found."}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onOpen={onOpenJobOverview} />
      ))}
    </div>
  );
}