// frontend/src/pages/dashboard/upcoming-jobs/UpcomingPlanningPage.tsx
import React, { useMemo, useState } from "react";
import type { UpcomingPlanningJob } from "../../jobs/jobs.types";
import useUpcomingPlanning from "../../jobs/state/useUpcomingPlanning";
import UpcomingPlanningNoteModal from "./UpcomingPlanningNoteModal";

type Props = {
  onBack: () => void;
};

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function isUsable(value?: string | null): boolean {
  const s = clean(value);
  return !!s && s.toLowerCase() !== "none";
}

function joinNamePhone(name?: string | null, phone?: string | null): string {
  const n = clean(name);
  const p = clean(phone);

  const hasName = isUsable(n);
  const hasPhone = isUsable(p);

  if (hasName && hasPhone) return `${n} - ${p}`;
  if (hasName) return n;
  if (hasPhone) return p;
  return "None";
}

function textOrNone(value?: string | null): string {
  const s = clean(value);
  return s || "None";
}

function matchesSearch(job: UpcomingPlanningJob, search: string): boolean {
  const s = search.trim().toLowerCase();
  if (!s) return true;

  return [
    job.itemName,
    job.jobNumber ?? "",
    job.address ?? "",
    job.gc ?? "",
    job.pm ?? "",
    job.super ?? "",
    job.superCell ?? "",
    job.gcpm ?? "",
    job.gcpmCell ?? "",
    (job.months ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(s);
}

export default function UpcomingPlanningPage({ onBack }: Props) {
  const { jobs, loading, refreshing, error, reload, setJobs } = useUpcomingPlanning();
  const [search, setSearch] = useState("");
  const [activeNoteJob, setActiveNoteJob] = useState<UpcomingPlanningJob | null>(null);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => matchesSearch(job, search));
  }, [jobs, search]);

  return (
    <div
      className="dashCard dashCardFlex upcomingPlanningShell"
      aria-label="Upcoming Planning Page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div
        className="dashCardHead"
        style={{
          flex: "0 0 auto",
          position: "relative",
          zIndex: 10,
          background: "rgba(16, 26, 51, 0.72)",
          backdropFilter: "blur(10px)",
          padding: 14,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div className="dashCardTitle">Upcoming Jobs</div>
        </div>

        <div className="dashFilters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="dashInput"
            aria-label="Search upcoming planning jobs"
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

          <button
            type="button"
            className="dashMiniPill"
            onClick={onBack}
            title="Back to dashboard"
          >
            <span>Back</span>
          </button>
        </div>
      </div>

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          marginRight: 12,
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 12,
        }}
      >
        {error && jobs.length === 0 ? (
          <div className="dashEmpty">
            {error}
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="dashBtn"
                onClick={() => {
                  void reload();
                }}
              >
                Try again
              </button>
            </div>
          </div>
        ) : loading && jobs.length === 0 ? (
          <div className="dashEmpty">Loading upcoming jobs…</div>
        ) : filteredJobs.length === 0 ? (
          <div className="dashEmpty">No upcoming planning jobs found.</div>
        ) : (
          <div className="jobsListStack">
            {filteredJobs.map((job) => {
              const titleLine = job.jobNumber ? `${job.itemName} – ${job.jobNumber}` : job.itemName;
              const addressLine = textOrNone(job.address);
              const leftGc = textOrNone(job.gc);
              const leftGcpm = joinNamePhone(job.gcpm, job.gcpmCell);
              const rightPm = textOrNone(job.pm);
              const rightSuper = joinNamePhone(job.super, job.superCell);
              const monthsLabel = (job.months ?? []).join(", ") || "None";

              return (
                <div key={job.itemId} className="jobsListCard upcomingPlanningCard">
                  <div className="upcomingPlanningHeader">
                    <div className="upcomingPlanningHeaderLeft">
                      <div className="upcomingPlanningTitle">{titleLine}</div>
                      <div className="upcomingPlanningAddress">{addressLine}</div>
                    </div>

                    <div className="upcomingPlanningHeaderRight">
                      <div className="upcomingPlanningMonthsPill">{monthsLabel}</div>
                    </div>
                  </div>

                  <div className="upcomingPlanningDivider" />

                  <div className="upcomingPlanningBody">
                    <div className="upcomingPlanningDetails">
                      <div className="upcomingPlanningCol">
                        <div className="upcomingPlanningLine">
                          <span className="upcomingPlanningLabel">GC:</span>
                          <span className="upcomingPlanningValue">{leftGc}</span>
                        </div>

                        <div className="upcomingPlanningLine">
                          <span className="upcomingPlanningLabel">GCPM:</span>
                          <span className="upcomingPlanningValue">{leftGcpm}</span>
                        </div>
                      </div>

                      <div className="upcomingPlanningCol">
                        <div className="upcomingPlanningLine">
                          <span className="upcomingPlanningLabel">PM:</span>
                          <span className="upcomingPlanningValue">{rightPm}</span>
                        </div>

                        <div className="upcomingPlanningLine">
                          <span className="upcomingPlanningLabel">Super:</span>
                          <span className="upcomingPlanningValue">{rightSuper}</span>
                        </div>
                      </div>
                    </div>

                    <div className="upcomingPlanningNoteCol">
                      <button
                        type="button"
                        className="upcomingPlanningNoteBtn"
                        onClick={() => setActiveNoteJob(job)}
                        title="Open notes"
                        aria-label={`Open notes for ${job.itemName}`}
                      >
                        <span className="upcomingPlanningNoteIcon" aria-hidden="true">🗒</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div aria-hidden="true" style={{ height: 14 }} />
      </div>

      {activeNoteJob ? (
        <UpcomingPlanningNoteModal
          job={activeNoteJob}
          onClose={() => setActiveNoteJob(null)}
          onSaved={(itemId) => {
            setJobs((prev) =>
              prev.map((job) =>
                job.itemId === itemId
                  ? {
                      ...job,
                      hasNote: true,
                    }
                  : job
              )
            );
          }}
        />
      ) : null}
    </div>
  );
}