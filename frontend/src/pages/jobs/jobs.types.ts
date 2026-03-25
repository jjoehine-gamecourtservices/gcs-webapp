export type JobCardModel = {
  id: string;
  jobName: string;
  jobNumber?: string;
  address?: string;
  generalContractor?: string;
  gcpm?: string;
  gcpmContact?: string;
  super?: string;
  superContact?: string;
  pm?: string;
  installer?: string;
  installerContact?: string;
  startDate?: string;
  endDate?: string;
};

export type MondayUpcomingJob = {
  id: string;
  name?: string;
  job_number?: string;
  jobName?: string;
  jobNumber?: string;
  address?: string;
  generalContractor?: string;
  gcpm?: string;
  gcpmContact?: string;
  super?: string;
  superContact?: string;
  pm?: string;
  installer?: string;
  installerContact?: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type MondayUpcomingJobsResponse = {
  jobs: MondayUpcomingJob[];
};