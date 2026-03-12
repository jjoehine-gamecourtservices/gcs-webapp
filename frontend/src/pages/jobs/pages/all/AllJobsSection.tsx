import React, { useEffect, useMemo, useRef, useState } from "react";
import type { JobListItem } from "../../state/useJobsAll";
import AllJobsList from "./AllJobsList";

const PM_FILTER_OPTIONS = [
  "Bryce Cathcart",
  "Jacob Kinsey",
  "Juilia McElligott",
  "Justin Spraberry",
] as const;

const PM_FILTER_STORAGE_KEY = "gcs_jobs_pm_filters_v1";

function readSavedPmFilters(): string[] {
  try {
    const raw = localStorage.getItem(PM_FILTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => String(x).trim())
      .filter((x) => PM_FILTER_OPTIONS.includes(x as (typeof PM_FILTER_OPTIONS)[number]));
  } catch {
    return [];
  }
}

function writeSavedPmFilters(filters: string[]) {
  try {
    localStorage.setItem(PM_FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore storage failures
  }
}

type Props = {
  jobs: JobListItem[];
  loading: boolean;
  refreshing: boolean;
  reload: () => Promise<void>;
  bottomBufferPx: number;
  onOpen: (jobNumber: string) => void;
  onPin: (jobNumber: string) => void;
};

export default function AllJobsSection({
  jobs,
  loading,
  refreshing,
  reload,
  bottomBufferPx,
  onOpen,
  onPin,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedPms, setSelectedPms] = useState<string[]>(() => readSavedPmFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersWrapRef = useRef<HTMLDivElement | null>(null);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aNum = parseInt(a.jobNumber ?? "0", 10);
      const bNum = parseInt(b.jobNumber ?? "0", 10);
      return bNum - aNum;
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasPmFilter = selectedPms.length > 0;

    return sortedJobs.filter((job) => {
      const matchesSearch =
        !q ||
        (job.jobNumber ?? "").toLowerCase().includes(q) ||
        (job.jobName ?? "").toLowerCase().includes(q);

      const pmName = (job.pm ?? "").trim();
      const matchesPm = !hasPmFilter || selectedPms.includes(pmName);

      return matchesSearch && matchesPm;
    });
  }, [sortedJobs, search, selectedPms]);

  const hasActiveFilters = selectedPms.length > 0;

  function togglePmFilter(pm: string) {
    setSelectedPms((current) => {
      const next = current.includes(pm) ? current.filter((x) => x !== pm) : [...current, pm];
      writeSavedPmFilters(next);
      return next;
    });
  }

  function clearPmFilters() {
    writeSavedPmFilters([]);
    setSelectedPms([]);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const wrap = filtersWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }

    if (!filtersOpen) return;

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filtersOpen]);

  return (
    <section
      className="dashCard dashCardFlex jobsListSection"
      aria-label="Jobs List"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div
        className="dashCardHead jobsPanelHead"
        style={{
          flex: "0 0 auto",
          position: "relative",
          zIndex: 10,
          background: "rgba(16, 26, 51, 0.72)",
          backdropFilter: "blur(10px)",
          padding: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div className="dashCardTitle">Jobs</div>
        </div>

        <div className="dashFilters">
          <input
            className="dashInput"
            placeholder="Search job or number"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            className="dashMiniPill jobsRefreshButton"
            onClick={() => {
              void reload();
            }}
            style={{ cursor: refreshing ? "wait" : "pointer" }}
            title="Refresh jobs"
            disabled={refreshing}
          >
            {refreshing ? <span className="jobsRefreshSpinner" aria-hidden="true" /> : null}
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <div ref={filtersWrapRef} style={{ position: "relative" }}>
            <button
              className="dashMiniPill jobsActionButton jobsFilterButton"
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label="Filters"
              style={{
                position: "relative",
                paddingRight: hasActiveFilters ? 28 : undefined,
              }}
            >
              <span>Filters</span>
              {hasActiveFilters && (
                <span
                  aria-hidden="true"
                  className="jobsFilterActiveDot"
                />
              )}
            </button>

            {filtersOpen && (
              <div className="jobsFilterPopover">
                <div className="jobsFilterPopoverTitle">PM Filter</div>

                <div className="jobsFilterOptions">
                  {PM_FILTER_OPTIONS.map((pm) => {
                    const checked = selectedPms.includes(pm);
                    return (
                      <label key={pm} className="jobsFilterOption">
                        <input type="checkbox" checked={checked} onChange={() => togglePmFilter(pm)} />
                        <span>{pm}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="jobsFilterFooter">
                  <div className="jobsFilterFooterText">
                    {selectedPms.length === 0 ? "No filters active" : `${selectedPms.length} active`}
                  </div>

                  <button
                    className="dashBtn"
                    type="button"
                    onClick={clearPmFilters}
                    disabled={!hasActiveFilters}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AllJobsList
        jobs={filteredJobs}
        loading={loading}
        bottomBufferPx={bottomBufferPx}
        onOpen={onOpen}
        onPin={onPin}
      />
    </section>
  );
}