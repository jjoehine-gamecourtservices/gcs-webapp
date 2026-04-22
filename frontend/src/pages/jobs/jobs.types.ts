// frontend/src/pages/jobs/jobs.types.ts
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

export type UpcomingPlanningJob = {
  itemId: string;
  itemName: string;
  months: string[];
  jobNumber?: string | null;
  address?: string | null;
  gc?: string | null;
  pm?: string | null;
  super?: string | null;
  superCell?: string | null;
  gcpm?: string | null;
  gcpmCell?: string | null;
  hasNote: boolean;
};

export type UpcomingPlanningJobsResponse = {
  jobs: UpcomingPlanningJob[];
};

export type UpcomingPlanningNote = {
  itemId: string;
  noteText: string;
  updatedAt?: string | null;
};