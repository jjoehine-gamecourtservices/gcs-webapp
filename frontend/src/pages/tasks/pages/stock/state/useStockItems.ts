// frontend/src/pages/tasks/pages/stock/state/useStockItems.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchStockItems } from "../stock.api";
import type { StockItem } from "../stock.types";

type State = {
  items: StockItem[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export default function useStockItems(): State {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const nextItems = await fetchStockItems();
      setItems(Array.isArray(nextItems) ? nextItems : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load stock items.";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      items,
      loading,
      error,
      refresh,
    }),
    [items, loading, error, refresh],
  );
}