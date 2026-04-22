// frontend/src/pages/jobs/state/useUpcomingPlanning.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchUpcomingPlanningJobs,
  fetchUpcomingPlanningMeta,
  refreshUpcomingPlanningJobs,
} from "../jobs.api";
import type { UpcomingPlanningJob } from "../jobs.types";

type UseUpcomingPlanningResult = {
  jobs: UpcomingPlanningJob[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  setJobs: React.Dispatch<React.SetStateAction<UpcomingPlanningJob[]>>;
};

const META_POLL_MS = 30_000;

export default function useUpcomingPlanning(): UseUpcomingPlanningResult {
  const [jobs, setJobs] = useState<UpcomingPlanningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestUpdatedAtRef = useRef<string>("");

  const loadFromCache = useCallback(async () => {
    const data = await fetchUpcomingPlanningJobs();
    setJobs(Array.isArray(data) ? data : []);
  }, []);

  const reload = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const data = await refreshUpcomingPlanningJobs();
      setJobs(Array.isArray(data) ? data : []);

      try {
        const meta = await fetchUpcomingPlanningMeta();
        latestUpdatedAtRef.current = meta.updatedAt || "";
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to refresh upcoming planning jobs");
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
        const meta = await fetchUpcomingPlanningMeta();

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
          setError(e?.message ? String(e.message) : "Failed to load upcoming planning jobs");
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
        const meta = await fetchUpcomingPlanningMeta();
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
        // ignore polling failure
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
    () => ({ jobs, loading, refreshing, error, reload, setJobs }),
    [jobs, loading, refreshing, error, reload]
  );
}