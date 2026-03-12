import { useCallback, useEffect, useState } from "react";
import { fetchRentals } from "../rentals.api";
import type { RentalListItem } from "../rentals.types";

const CACHE_KEY = "gcs_rentals_cache_v1";
const CACHE_DATE_KEY = "gcs_rentals_cache_date_v1";

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readCache(): RentalListItem[] | null {
  try {
    const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
    if (cachedDate !== todayKey()) return null;

    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RentalListItem[];
    if (!Array.isArray(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rentals: RentalListItem[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rentals));
    localStorage.setItem(CACHE_DATE_KEY, todayKey());
  } catch {
    // ignore storage failures
  }
}

export default function useRentals() {
  const [rentals, setRentals] = useState<RentalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setRentals(cached);
        setLoading(false);
        return;
      }
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchRentals();
      setRentals(data);
      writeCache(data);
    } catch (e) {
      console.warn("[rentals] failed", e);
      setRentals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const reload = useCallback(async () => {
    await load(true);
  }, [load]);

  return { rentals, loading, refreshing, reload };
}