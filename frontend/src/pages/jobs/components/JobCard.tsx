import React, { useMemo } from "react";
import type { JobCardModel } from "../jobs.types";

type Props = {
  job: JobCardModel;
  onOpen: (jobId: string) => void;
};

function parseYmdLocal(ymd?: string): Date | null {
  const s = (ymd ?? "").trim();
  if (!s) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;

  // Local midnight avoids UTC off-by-one issues
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

type StatusBadge = "Active" | "Upcoming" | "";

function computeStatusBadge(startDate?: string, endDate?: string): StatusBadge {
  const start = parseYmdLocal(startDate);
  const end = parseYmdLocal(endDate);
  if (!start || !end) return "";

  const today = startOfTodayLocal().getTime();
  const s = start.getTime();
  const e = end.getTime();

  if (today < s) return "Upcoming";
  if (today >= s && today <= e) return "Active";
  return "";
}

export default function JobCard({ job, onOpen }: Props) {
  // CRITICAL: do NOT ever show Monday item id.
  const jobNumberLabel = (job.jobNumber ?? "").trim(); // <-- removed "|| job.id"

  const titleLine = useMemo(() => {
    const name = (job.jobName ?? "").trim();
    if (!name) return jobNumberLabel;
    if (!jobNumberLabel) return name;
    return `${name} – ${jobNumberLabel}`;
  }, [job.jobName, jobNumberLabel]);

  const dateRange = useMemo(
    () => `${job.startDate ?? ""}${job.startDate && job.endDate ? " – " : ""}${job.endDate ?? ""}`,
    [job.startDate, job.endDate]
  );

  const statusBadge = useMemo(() => computeStatusBadge(job.startDate, job.endDate), [job.startDate, job.endDate]);

  const addressLine = useMemo(() => (job.address ?? "").trim(), [job.address]);

  const leftPrimary = useMemo(() => job.generalContractor ?? "", [job.generalContractor]);
  const leftSecondary = useMemo(() => job.gcpm ?? "", [job.gcpm]);
  const leftContact = useMemo(() => job.gcpmContact ?? "", [job.gcpmContact]);

  const rightPrimary = useMemo(() => job.pm ?? "", [job.pm]);
  const rightSecondary = useMemo(() => job.installer ?? "", [job.installer]);
  const rightContact = useMemo(() => job.installerContact ?? "", [job.installerContact]);

  const hasLeft = Boolean(leftPrimary || leftSecondary || leftContact);
  const hasRight = Boolean(rightPrimary || rightSecondary || rightContact);

  // Helper for single-line [label]: [info]
  function LabelInline({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "baseline", color: "rgba(255,255,255,0.92)" }}>
        <div style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{label}:</div>
        <div style={{ minWidth: 0, wordBreak: "break-word" }}>{value}</div>
      </div>
    );
  }

  // EXACT existing pill style (the date pill). We'll reuse it for Upcoming.
  const basePillStyle: React.CSSProperties = {
    fontSize: 12,
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
  };

  // Active pill: green but subtle.
  const activePillStyle: React.CSSProperties = {
    ...basePillStyle,
    border: "1px solid rgba(46, 204, 113, 0.55)",
    background: "rgba(46, 204, 113, 0.18)",
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(job.id)}
      className="dashCard"
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        border: "none",
        padding: 0,
        background: "transparent",
      }}
      aria-label="Open job"
    >
      <div
        style={{
          borderRadius: 14,
          padding: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        {/* Header row (structure unchanged) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "start",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {/* If titleLine is empty, render nothing (no visible header text) */}
            {titleLine ? <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 4 }}>{titleLine}</div> : null}
            {addressLine && <div style={{ fontSize: 12, opacity: 0.85 }}>{addressLine}</div>}
          </div>

          {/* Right side: SAME POSITION as before, but now can show 2 bubbles */}
          {(statusBadge || dateRange) && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
              {statusBadge && (
                <div style={statusBadge === "Active" ? activePillStyle : basePillStyle}>{statusBadge}</div>
              )}

              {dateRange && <div style={basePillStyle}>{dateRange}</div>}
            </div>
          )}
        </div>

        {/* Body: two-column contacts (structure unchanged) */}
        {(hasLeft || hasRight) && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.10)",
              display: "grid",
              gridTemplateColumns: hasLeft && hasRight ? "1fr 1fr" : "1fr",
              gap: 14,
            }}
          >
            {hasLeft && (
              <div style={{ display: "grid", gap: 10 }}>
                <LabelInline label="GC" value={leftPrimary} />
                <LabelInline label="GCPM" value={leftSecondary} />
                <LabelInline label="Contact" value={leftContact} />
              </div>
            )}
            {hasRight && (
              <div style={{ display: "grid", gap: 10 }}>
                <LabelInline label="PM" value={rightPrimary} />
                <LabelInline label="Installer" value={rightSecondary} />
                <LabelInline label="Contact" value={rightContact} />
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}