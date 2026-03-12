import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRentalRequestSources, type RentalRequestSourcesResponse } from "./RentalRequestSources.api";
import type { RentalRequestOption } from "../../rentalrequest.types";

type UseRentalRequestSourcesResult = {
  sources: RentalRequestSourcesResponse;
  loading: boolean;
  refreshing: boolean;
  error: string;
  reload: () => Promise<void>;
  setEquipmentTypes: (options: RentalRequestOption[]) => void;
  setAccessories: (options: RentalRequestOption[]) => void;
};

type SourcesCachePayload = {
  version: 2;
  cachedAt: number;
  expiresAt: number;
  data: RentalRequestSourcesResponse;
};

const CACHE_KEY = "gcs.rentalRequest.sources.v2";

function emptySources(): RentalRequestSourcesResponse {
  return {
    jobs: [],
    people: [],
    deliveryOptions: [],
    equipmentTypes: [],
    sizeOptions: [],
    drivetrainOptions: [],
    accessories: [],
    contacts: [],
    companies: [],
  };
}

function getNextLocalMidnightMs(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function isValidOptionArray(value: unknown): boolean {
  return Array.isArray(value);
}

function safeReadCache(nowMs: number): RentalRequestSourcesResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SourcesCachePayload>;
    if (parsed.version !== 2) return null;
    if (typeof parsed.expiresAt !== "number") return null;
    if (!parsed.data || typeof parsed.data !== "object") return null;

    if (nowMs >= parsed.expiresAt) {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
      return null;
    }

    const data = parsed.data as Partial<RentalRequestSourcesResponse>;

    if (
      !isValidOptionArray(data.jobs) ||
      !isValidOptionArray(data.people) ||
      !isValidOptionArray(data.deliveryOptions) ||
      !isValidOptionArray(data.equipmentTypes) ||
      !isValidOptionArray(data.sizeOptions) ||
      !isValidOptionArray(data.drivetrainOptions) ||
      !isValidOptionArray(data.accessories) ||
      !isValidOptionArray(data.contacts) ||
      !isValidOptionArray(data.companies)
    ) {
      return null;
    }

    return data as RentalRequestSourcesResponse;
  } catch {
    return null;
  }
}

function safeWriteCache(data: RentalRequestSourcesResponse, nowMs: number): void {
  const payload: SourcesCachePayload = {
    version: 2,
    cachedAt: nowMs,
    expiresAt: getNextLocalMidnightMs(new Date(nowMs)),
    data,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export default function useRentalRequestSources(): UseRentalRequestSourcesResult {
  const [sources, setSources] = useState<RentalRequestSourcesResponse>(emptySources);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const persistSources = useCallback((next: RentalRequestSourcesResponse) => {
    setSources(next);
    safeWriteCache(next, Date.now());
  }, []);

  const setEquipmentTypes = useCallback(
    (options: RentalRequestOption[]) => {
      persistSources({
        ...sources,
        equipmentTypes: Array.isArray(options) ? options : [],
      });
    },
    [persistSources, sources]
  );

  const setAccessories = useCallback(
    (options: RentalRequestOption[]) => {
      persistSources({
        ...sources,
        accessories: Array.isArray(options) ? options : [],
      });
    },
    [persistSources, sources]
  );

  const load = useCallback(async (forceRefresh = false) => {
    const nowMs = Date.now();

    if (!forceRefresh) {
      const cached = safeReadCache(nowMs);
      if (cached) {
        setSources(cached);
        setLoading(false);
        setRefreshing(false);
        setError("");
        return;
      }
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchRentalRequestSources();
      setSources(data);
      safeWriteCache(data, nowMs);
      setError("");
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to load rental request sources");
      if (!forceRefresh) {
        setSources(emptySources());
      }
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

  return useMemo(
    () => ({
      sources,
      loading,
      refreshing,
      error,
      reload,
      setEquipmentTypes,
      setAccessories,
    }),
    [sources, loading, refreshing, error, reload, setEquipmentTypes, setAccessories]
  );
}