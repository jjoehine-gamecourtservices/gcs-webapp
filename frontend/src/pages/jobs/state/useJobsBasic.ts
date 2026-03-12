import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUpcomingJobsBasic } from "../jobs.api";
import { mapMondayBasicToJobCardModel } from "../jobs.mapper";
import type { JobCardModel } from "../jobs.types";

type UseJobsBasicResult = {
  jobs: JobCardModel[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
};

type JobsBasicCachePayload = {
  version: 1;
  cachedAt: number; // ms epoch
  expiresAt: number; // ms epoch (local midnight)
  jobs: JobCardModel[];
};

const CACHE_KEY = "gcs.jobsBasic.upcoming.v1";

function getNextLocalMidnightMs(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0); // local time: next midnight
  return next.getTime();
}

function safeReadCache(nowMs: number): JobsBasicCachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<JobsBasicCachePayload>;

    if (parsed.version !== 1) return null;
    if (!Array.isArray(parsed.jobs)) return null;
    if (typeof parsed.expiresAt !== "number") return null;

    if (nowMs >= parsed.expiresAt) {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
      return null;
    }

    return parsed as JobsBasicCachePayload;
  } catch {
    return null;
  }
}

function safeWriteCache(jobs: JobCardModel[], nowMs: number): void {
  const payload: JobsBasicCachePayload = {
    version: 1,
    cachedAt: nowMs,
    expiresAt: getNextLocalMidnightMs(new Date(nowMs)),
    jobs,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export default function useJobsBasic(): UseJobsBasicResult {
  const [jobs, setJobs] = useState<JobCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const nowMs = Date.now();
      const force = reloadToken > 0;

      setError(null);

      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!force) {
        const cached = safeReadCache(nowMs);
        if (cached && !cancelled) {
          setJobs(cached.jobs);
          setLoading(false);
          return;
        }
      }

      try {
        const mondayJobs = await fetchUpcomingJobsBasic();
        const mapped = mondayJobs.map(mapMondayBasicToJobCardModel);

        safeWriteCache(mapped, nowMs);

        if (!cancelled) {
          setJobs(mapped);
          setLoading(false);
          setRefreshing(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setJobs([]);
          setLoading(false);
          setRefreshing(false);
          setError(e?.message ? String(e.message) : "Failed to load jobs");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return useMemo(
    () => ({ jobs, loading, refreshing, error, reload }),
    [jobs, loading, refreshing, error, reload]
  );
}