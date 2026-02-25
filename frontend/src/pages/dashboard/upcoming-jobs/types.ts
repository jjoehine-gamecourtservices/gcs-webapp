export type UpcomingJob = {
  id: string | number;
  name: string;
  job_number: string | number | null;
};

export type UpcomingJobsResponse = {
  jobs: UpcomingJob[];
};