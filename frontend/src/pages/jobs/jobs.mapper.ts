import type { JobCardModel, MondayUpcomingJob } from "./jobs.types";

const NONE = "None";

function clean(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function noneIfEmpty(v: unknown): string {
  const s = clean(v);
  return s ? s : NONE;
}

function undefIfEmpty(v: unknown): string | undefined {
  const s = clean(v);
  return s ? s : undefined;
}

export function mapMondayBasicToJobCardModel(j: MondayUpcomingJob): JobCardModel {
  const jobName = clean((j as any).jobName) || clean((j as any).name);
  const jobNumber = clean((j as any).jobNumber) || clean((j as any).job_number);

  const address = clean((j as any).address);
  const generalContractor = clean((j as any).generalContractor);
  const gcpm = clean((j as any).gcpm);
  const gcpmContact = clean((j as any).gcpmContact);
  const jobSuper = clean((j as any).super);
  const superContact = clean((j as any).superContact);
  const pm = clean((j as any).pm);

  const installer = clean((j as any).installer);
  const installerContact = clean((j as any).installerContact);
  const startDate = clean((j as any).startDate);
  const endDate = clean((j as any).endDate);

  return {
    id: String(j.id),
    jobName: jobName ? jobName : "",
    jobNumber: undefIfEmpty(jobNumber),
    address: noneIfEmpty(address),
    generalContractor: noneIfEmpty(generalContractor),
    gcpm: noneIfEmpty(gcpm),
    gcpmContact: noneIfEmpty(gcpmContact),
    super: noneIfEmpty(jobSuper),
    superContact: noneIfEmpty(superContact),
    pm: noneIfEmpty(pm),
    installer: noneIfEmpty(installer),
    installerContact: noneIfEmpty(installerContact),
    startDate: undefIfEmpty(startDate),
    endDate: undefIfEmpty(endDate),
  };
}