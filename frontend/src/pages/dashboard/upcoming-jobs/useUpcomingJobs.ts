import { useCallback, useEffect, useState } from "react";
import type { UpcomingJob, UpcomingJobsResponse } from "./types";

type UseUpcomingJobsResult = {
  jobs: UpcomingJob[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export default function useUpcomingJobs(): UseUpcomingJobsResult {
  const [jobs, setJobs] = useState<UpcomingJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const r = await fetch("/api/monday/upcoming-jobs", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status}${text ? `: ${text}` : ""}`);
        }

        const data = (await r.json()) as UpcomingJobsResponse;

        if (!cancelled) {
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setJobs([]);
          setLoading(false);
          setError(e?.message ? String(e.message) : "Failed to load upcoming jobs");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { jobs, loading, error, reload };
}