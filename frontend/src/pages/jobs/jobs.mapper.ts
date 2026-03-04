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
  // Prefer the current backend camelCase fields; fall back to legacy
  const jobName = clean((j as any).jobName) || clean((j as any).name);
  const jobNumber = clean((j as any).jobNumber) || clean((j as any).job_number);

  // Enriched via gateway JSON (when present)
  const address = clean((j as any).address);
  const generalContractor = clean((j as any).generalContractor);
  const gcpm = clean((j as any).gcpm);
  const gcpmContact = clean((j as any).gcpmContact);
  const pm = clean((j as any).pm);

  // Monday schedule + installer (already working)
  const installer = clean((j as any).installer);
  const installerContact = clean((j as any).installerContact);
  const startDate = clean((j as any).startDate);
  const endDate = clean((j as any).endDate);

  return {
    id: String(j.id),

    // Header
    jobName: jobName ? jobName : "",
    jobNumber: undefIfEmpty(jobNumber),

    // Location
    address: noneIfEmpty(address),

    // Parties
    generalContractor: noneIfEmpty(generalContractor),
    gcpm: noneIfEmpty(gcpm),
    gcpmContact: noneIfEmpty(gcpmContact),
    pm: noneIfEmpty(pm),

    // Installer
    installer: noneIfEmpty(installer),
    installerContact: noneIfEmpty(installerContact),

    // Schedule (keep undefined if empty so UI can avoid weird pills)
    startDate: undefIfEmpty(startDate),
    endDate: undefIfEmpty(endDate),
  };
}