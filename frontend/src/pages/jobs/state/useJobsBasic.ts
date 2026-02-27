import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUpcomingJobsBasic } from "../jobs.api";
import { mapMondayBasicToJobCardModel } from "../jobs.mapper";
import type { JobCardModel } from "../jobs.types";

type UseJobsBasicResult = {
  jobs: JobCardModel[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export default function useJobsBasic(): UseJobsBasicResult {
  const [jobs, setJobs] = useState<JobCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const mondayJobs = await fetchUpcomingJobsBasic();
        const mapped = mondayJobs.map(mapMondayBasicToJobCardModel);

        if (!cancelled) {
          setJobs(mapped);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setJobs([]);
          setLoading(false);
          setError(e?.message ? String(e.message) : "Failed to load jobs");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return useMemo(() => ({ jobs, loading, error, reload }), [jobs, loading, error, reload]);
}