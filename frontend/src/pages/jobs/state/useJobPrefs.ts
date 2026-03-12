import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "../../../api/api";

type JobPrefsDto = {
  recent_job_numbers: string[];
  pinned_job_numbers: string[];
};

function normalizeJobNumber(v: string): string {
  return (v ?? "").trim();
}

function dedupePreserveOrder(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const v = normalizeJobNumber(raw);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

function addToFrontUnique(max: number, jobNumber: string, list: string[]): string[] {
  const j = normalizeJobNumber(jobNumber);
  if (!j) return list;
  const next = [j, ...list.filter((x) => normalizeJobNumber(x) !== j)];
  return next.slice(0, max);
}

function moveItemUp(list: string[], jobNumber: string): string[] {
  const j = normalizeJobNumber(jobNumber);
  const idx = list.findIndex((x) => normalizeJobNumber(x) === j);
  if (idx <= 0) return list;
  const next = [...list];
  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
  return next;
}

function moveItemDown(list: string[], jobNumber: string): string[] {
  const j = normalizeJobNumber(jobNumber);
  const idx = list.findIndex((x) => normalizeJobNumber(x) === j);
  if (idx < 0 || idx >= list.length - 1) return list;
  const next = [...list];
  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
  return next;
}

export default function useJobPrefs() {
  const [recentJobNumbers, setRecentJobNumbers] = useState<string[]>([]);
  const [pinnedJobNumbers, setPinnedJobNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const recentRef = useRef<string[]>([]);
  const pinnedRef = useRef<string[]>([]);

  const savingRef = useRef(false);
  const queuedRef = useRef<JobPrefsDto | null>(null);

  const applyLocalState = useCallback((recent: string[], pinned: string[]) => {
    const cleanRecent = dedupePreserveOrder(recent).slice(0, 10);
    const cleanPinned = dedupePreserveOrder(pinned);

    recentRef.current = cleanRecent;
    pinnedRef.current = cleanPinned;

    setRecentJobNumbers(cleanRecent);
    setPinnedJobNumbers(cleanPinned);
  }, []);

  const flushSaveQueue = useCallback(async () => {
    if (savingRef.current) return;
    if (!queuedRef.current) return;

    savingRef.current = true;
    const payload = queuedRef.current;
    queuedRef.current = null;

    try {
      const r = await apiJson<JobPrefsDto>("/api/user/job-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok && r.data) {
        applyLocalState(r.data.recent_job_numbers, r.data.pinned_job_numbers);
      } else {
        console.warn("[job-prefs] PUT failed", { status: r.status, text: r.text });
      }
    } catch (e) {
      console.warn("[job-prefs] PUT exception", e);
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        void flushSaveQueue();
      }
    }
  }, [applyLocalState]);

  const save = useCallback(
    (recent: string[], pinned: string[]) => {
      queuedRef.current = {
        recent_job_numbers: dedupePreserveOrder(recent).slice(0, 10),
        pinned_job_numbers: dedupePreserveOrder(pinned),
      };
      void flushSaveQueue();
    },
    [flushSaveQueue]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const r = await apiJson<JobPrefsDto>("/api/user/job-prefs", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (cancelled) return;

        if (r.ok && r.data) {
          applyLocalState(r.data.recent_job_numbers, r.data.pinned_job_numbers);
        } else {
          console.warn("[job-prefs] GET failed", { status: r.status, text: r.text });
          applyLocalState([], []);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("[job-prefs] GET exception", e);
          applyLocalState([], []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLocalState]);

  const addRecent = useCallback(
    (jobNumber: string) => {
      const nextRecent = addToFrontUnique(10, jobNumber, recentRef.current);
      const nextPinned = pinnedRef.current;

      applyLocalState(nextRecent, nextPinned);
      save(nextRecent, nextPinned);
    },
    [applyLocalState, save]
  );

  const removeRecent = useCallback(
    (jobNumber: string) => {
      const j = normalizeJobNumber(jobNumber);
      const nextRecent = recentRef.current.filter((x) => normalizeJobNumber(x) !== j);
      const nextPinned = pinnedRef.current;

      applyLocalState(nextRecent, nextPinned);
      save(nextRecent, nextPinned);
    },
    [applyLocalState, save]
  );

  const pinJob = useCallback(
    (jobNumber: string) => {
      const nextPinned = dedupePreserveOrder([jobNumber, ...pinnedRef.current]);
      const nextRecent = recentRef.current;

      applyLocalState(nextRecent, nextPinned);
      save(nextRecent, nextPinned);
    },
    [applyLocalState, save]
  );

  const unpinJob = useCallback(
    (jobNumber: string) => {
      const j = normalizeJobNumber(jobNumber);
      const nextPinned = pinnedRef.current.filter((x) => normalizeJobNumber(x) !== j);
      const nextRecent = recentRef.current;

      applyLocalState(nextRecent, nextPinned);
      save(nextRecent, nextPinned);
    },
    [applyLocalState, save]
  );

  const movePinnedUp = useCallback(
    (jobNumber: string) => {
      const nextPinned = moveItemUp(pinnedRef.current, jobNumber);
      const nextRecent = recentRef.current;

      applyLocalState(nextRecent, nextPinned);
      save(nextRecent, nextPinned);
    },
    [applyLocalState, save]
  );

  const movePinnedDown = useCallback(
    (jobNumber: string) => {
      const nextPinned = moveItemDown(pinnedRef.current, jobNumber);
      const nextRecent = recentRef.current;

      applyLocalState(nextRecent, nextPinned);
      save(nextRecent, nextPinned);
    },
    [applyLocalState, save]
  );

  const clearRecent = useCallback(() => {
    const nextRecent: string[] = [];
    const nextPinned = pinnedRef.current;

    applyLocalState(nextRecent, nextPinned);
    save(nextRecent, nextPinned);
  }, [applyLocalState, save]);

  return {
    loading,
    recentJobNumbers,
    pinnedJobNumbers,
    addRecent,
    removeRecent,
    pinJob,
    unpinJob,
    movePinnedUp,
    movePinnedDown,
    clearRecent,
  };
}