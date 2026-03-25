import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchUpcomingJobsBasic,
  fetchUpcomingJobsMeta,
  refreshUpcomingJobsBasic,
} from "../jobs.api";
import { mapMondayBasicToJobCardModel } from "../jobs.mapper";
import type { JobCardModel } from "../jobs.types";

type UseJobsBasicResult = {
  jobs: JobCardModel[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
};

const META_POLL_MS = 30_000;

export default function useJobsBasic(): UseJobsBasicResult {
  const [jobs, setJobs] = useState<JobCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestUpdatedAtRef = useRef<string>("");

  const loadFromCache = useCallback(async () => {
    const mondayJobs = await fetchUpcomingJobsBasic();
    const mapped = mondayJobs.map(mapMondayBasicToJobCardModel);
    setJobs(mapped);
  }, []);

  const reload = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const mondayJobs = await refreshUpcomingJobsBasic();
      const mapped = mondayJobs.map(mapMondayBasicToJobCardModel);
      setJobs(mapped);

      try {
        const meta = await fetchUpcomingJobsMeta();
        latestUpdatedAtRef.current = meta.updatedAt || "";
      } catch {
        // ignore meta fetch failure after successful refresh
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to refresh jobs");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runInitialLoad = async () => {
      setLoading(true);
      setError(null);

      try {
        const [meta] = await Promise.all([fetchUpcomingJobsMeta()]);

        if (cancelled) return;

        latestUpdatedAtRef.current = meta.updatedAt || "";

        await loadFromCache();

        if (cancelled) return;

        if (meta.refreshError) {
          setError(meta.refreshError);
        }
      } catch (e: any) {
        if (!cancelled) {
          setJobs([]);
          setError(e?.message ? String(e.message) : "Failed to load jobs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void runInitialLoad();

    return () => {
      cancelled = true;
    };
  }, [loadFromCache]);

  useEffect(() => {
    let cancelled = false;

    const pollMeta = async () => {
      try {
        const meta = await fetchUpcomingJobsMeta();
        if (cancelled) return;

        const nextUpdatedAt = meta.updatedAt || "";
        const prevUpdatedAt = latestUpdatedAtRef.current;

        if (!prevUpdatedAt && nextUpdatedAt) {
          latestUpdatedAtRef.current = nextUpdatedAt;
          await loadFromCache();
          if (meta.refreshError) {
            setError(meta.refreshError);
          }
          return;
        }

        if (nextUpdatedAt && nextUpdatedAt !== prevUpdatedAt) {
          latestUpdatedAtRef.current = nextUpdatedAt;
          await loadFromCache();
        }

        if (meta.refreshError) {
          setError(meta.refreshError);
        } else {
          setError(null);
        }
      } catch {
        // polling failures should not blank the page
      }
    };

    const timer = window.setInterval(() => {
      void pollMeta();
    }, META_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadFromCache]);

  return useMemo(
    () => ({ jobs, loading, refreshing, error, reload }),
    [jobs, loading, refreshing, error, reload]
  );
}