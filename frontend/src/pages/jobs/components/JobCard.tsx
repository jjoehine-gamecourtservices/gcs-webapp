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

function clean(value?: string): string {
  return (value ?? "").trim();
}

function isUsable(value?: string): boolean {
  const s = clean(value);
  return !!s && s.toLowerCase() !== "none";
}

function joinNamePhone(name?: string, phone?: string): string {
  const n = clean(name);
  const p = clean(phone);

  const hasName = isUsable(n);
  const hasPhone = isUsable(p);

  if (hasName && hasPhone) return `${n} - ${p}`;
  if (hasName) return n;
  if (hasPhone) return p;
  return "";
}

export default function JobCard({ job, onOpen }: Props) {
  const jobNumberLabel = (job.jobNumber ?? "").trim();

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

  const leftPrimary = useMemo(() => clean(job.generalContractor), [job.generalContractor]);
  const leftGcpm = useMemo(() => joinNamePhone(job.gcpm, job.gcpmContact), [job.gcpm, job.gcpmContact]);
  const leftSuper = useMemo(() => joinNamePhone(job.super, job.superContact), [job.super, job.superContact]);

  const rightPm = useMemo(() => clean(job.pm), [job.pm]);
  const rightInstaller = useMemo(() => joinNamePhone(job.installer, job.installerContact), [job.installer, job.installerContact]);

  const hasLeft = Boolean(isUsable(leftPrimary) || leftGcpm || leftSuper);
  const hasRight = Boolean(isUsable(rightPm) || rightInstaller);

  function LabelInline({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "baseline", color: "rgba(255,255,255,0.92)" }}>
        <div style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{label}:</div>
        <div style={{ minWidth: 0, wordBreak: "break-word" }}>{value}</div>
      </div>
    );
  }

  const basePillStyle: React.CSSProperties = {
    fontSize: 12,
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
  };

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
            {titleLine ? <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 4 }}>{titleLine}</div> : null}
            {addressLine && <div style={{ fontSize: 12, opacity: 0.85 }}>{addressLine}</div>}
          </div>

          {(statusBadge || dateRange) && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
              {statusBadge && (
                <div style={statusBadge === "Active" ? activePillStyle : basePillStyle}>{statusBadge}</div>
              )}

              {dateRange && <div style={basePillStyle}>{dateRange}</div>}
            </div>
          )}
        </div>

        {(hasLeft || hasRight) && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.10)",
              display: "grid",
              gridTemplateColumns: hasLeft && hasRight ? "1fr 1fr" : "1fr",
              gap: 14,
              alignItems: "start",
            }}
          >
            {hasLeft && (
              <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <LabelInline label="GC" value={isUsable(leftPrimary) ? leftPrimary : ""} />
                <LabelInline label="GCPM" value={leftGcpm} />
                <LabelInline label="Super" value={leftSuper} />
              </div>
            )}

            {hasRight && (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  alignContent: "start",
                  justifySelf: "start",
                  paddingTop: 2,
                }}
              >
                <LabelInline label="PM" value={isUsable(rightPm) ? rightPm : ""} />
                <LabelInline label="Installer" value={rightInstaller} />
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}