// frontend/src/pages/jobs/jobs.types.ts

export type JobCardModel = {
  id: string;

  // Header
  jobName: string;
  jobNumber?: string;

  // Location (Master JSON later)
  address?: string;

  // Parties (Master JSON later)
  generalContractor?: string;
  gcpm?: string;
  gcpmContact?: string;
  pm?: string; // GCS internal PM (name only)

  // Installation (Monday later)
  installer?: string;
  installerContact?: string;

  // Schedule (Monday later)
  startDate?: string;
  endDate?: string;
};

/**
 * Keep backward compatibility with the old shape (name/job_number),
 * but allow the backend’s current camelCase fields too.
 */
export type MondayUpcomingJob = {
  id: string;

  // old (legacy)
  name?: string;
  job_number?: string;

  // new (current backend)
  jobName?: string;
  jobNumber?: string;

  installer?: string;
  installerContact?: string;

  startDate?: string | null;
  endDate?: string | null;
};

export type MondayUpcomingJobsResponse = {
  jobs: MondayUpcomingJob[];
};