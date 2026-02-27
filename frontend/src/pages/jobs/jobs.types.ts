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

export type MondayUpcomingJob = {
  id: string;
  name: string;
  job_number: string;
};

export type MondayUpcomingJobsResponse = {
  jobs: MondayUpcomingJob[];
};