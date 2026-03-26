import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRentals, refreshRentals } from "../rentals.api";
import type { RentalListItem } from "../rentals.types";

type LoadOptions = {
  forceRefresh?: boolean;
};

export default function useRentals() {
  const [rentals, setRentals] = useState<RentalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: LoadOptions) => {
    const forceRefresh = options?.forceRefresh === true;

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = forceRefresh ? await refreshRentals() : await fetchRentals();
      setRentals(data);
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

  const patchRental = useCallback((itemId: string, updates: Partial<RentalListItem>) => {
    const targetId = (itemId ?? "").trim();
    if (!targetId) return;

    setRentals((current) =>
      current.map((rental) =>
        rental.id === targetId
          ? {
              ...rental,
              ...updates,
            }
          : rental
      )
    );
  }, []);

  return useMemo(
    () => ({
      rentals,
      loading,
      initialLoading: loading,
      refreshing,
      error,
      reload,
      patchRental,
    }),
    [rentals, loading, refreshing, error, reload, patchRental]
  );
}