import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRentals } from "../rentals.api";
import type { RentalListItem } from "../rentals.types";

const CACHE_KEY = "gcs_rentals_cache_v2";
const CACHE_UPDATED_AT_KEY = "gcs_rentals_cache_updated_at_v2";

function readCache(): { rentals: RentalListItem[]; updatedAt: string | null } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RentalListItem[];
    if (!Array.isArray(parsed)) return null;

    const updatedAt = localStorage.getItem(CACHE_UPDATED_AT_KEY);
    return {
      rentals: parsed,
      updatedAt: updatedAt && updatedAt.trim() ? updatedAt : null,
    };
  } catch {
    return null;
  }
}

function writeCache(rentals: RentalListItem[]): string {
  const updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rentals));
    localStorage.setItem(CACHE_UPDATED_AT_KEY, updatedAt);
  } catch {
    // ignore storage failures
  }

  return updatedAt;
}

type LoadOptions = {
  forceRefresh?: boolean;
};

export default function useRentals() {
  const [rentals, setRentals] = useState<RentalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (options?: LoadOptions) => {
    const forceRefresh = options?.forceRefresh === true;

    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setRentals(cached.rentals);
        setLastUpdated(cached.updatedAt);
        setLoading(false);
        setError(null);
        return;
      }
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await fetchRentals();
      setRentals(data);

      const updatedAt = writeCache(data);
      setLastUpdated(updatedAt);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to load rentals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(async () => {
    await load({ forceRefresh: true });
  }, [load]);

  return useMemo(
    () => ({
      rentals,
      loading,
      initialLoading: loading,
      refreshing,
      error,
      lastUpdated,
      reload,
    }),
    [rentals, loading, refreshing, error, lastUpdated, reload]
  );
}