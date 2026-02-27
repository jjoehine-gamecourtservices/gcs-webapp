import type { JobCardModel, MondayUpcomingJob } from "./jobs.types";

const NONE = "None";

export function mapMondayBasicToJobCardModel(j: MondayUpcomingJob): JobCardModel {
  const jobNumber = (j.job_number ?? "").trim();

  return {
    id: String(j.id),
    jobName: j.name ?? NONE,
    jobNumber: jobNumber ? jobNumber : undefined,

    // Master JSON later
    address: NONE,
    generalContractor: NONE,
    gcpm: NONE,
    gcpmContact: NONE,
    pm: NONE,

    // Monday later
    installer: NONE,
    installerContact: NONE,
    startDate: NONE,
    endDate: NONE,
  };
}