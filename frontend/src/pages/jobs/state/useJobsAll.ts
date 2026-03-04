import { useEffect, useState } from "react";

export type JobListItem = {
  jobNumber: string;
  jobName: string;
  address: string;

  gc: string;
  gcpm: string;
  gcpmContact: string;

  super: string;
  superContact: string;

  pm: string;

  // This is PSS install date (confirmed)
  pssInstallDate: string;

  // Not wired yet, placeholders for now
  contractAmount: string; // keep string for now (e.g. "$123,456")
  scopeLines: string[];   // one-line items
};

export default function useJobsAll() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TEMP: stub data so UI can be verified (no backend yet)
    const demo: JobListItem[] = [
      {
        jobNumber: "12731",
        jobName: "Stars Northlake",
        address: "13850 Chadwick Pkwy, Northlake, TX, USA",
        gc: "Lee Lewis",
        gcpm: "Jennifer Norris",
        gcpmContact: "(214) 837-0414",
        super: "Adam",
        superContact: "(512) 555-2211",
        pm: "Justin Kinsley",
        pssInstallDate: "02/16/2026",
        contractAmount: "—",
        scopeLines: ["—", "—", "—"],
      },
      {
        jobNumber: "12526",
        jobName: "Hamlin MS - OD",
        address: "3900 Hamlin Drive, Corpus Christi, TX, USA",
        gc: "Fulton Construction Corp",
        gcpm: "Sean Walker",
        gcpmContact: "(361) 816-2026",
        super: "—",
        superContact: "—",
        pm: "Justin Spraberry",
        pssInstallDate: "03/02/2026",
        contractAmount: "—",
        scopeLines: ["—", "—"],
      },
    ];

    const t = setTimeout(() => {
      setJobs(demo);
      setLoading(false);
    }, 250);

    return () => clearTimeout(t);
  }, []);

  return { jobs, loading };
}