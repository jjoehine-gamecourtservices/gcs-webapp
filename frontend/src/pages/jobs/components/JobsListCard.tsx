import React, { useMemo } from "react";
import type { JobListItem } from "../state/useJobsAll";

type Props = {
  job: JobListItem;
  onOpen: (jobNumber: string) => void;
  onPin?: (jobNumber: string) => void; // wiring later
};

function joinNamePhone(name?: string, phone?: string): string {
  const n = (name ?? "").trim();
  const p = (phone ?? "").trim();
  if (!n && !p) return "";
  if (n && !p) return n;
  if (!n && p) return p;
  return `${n} — ${p}`;
}

function PinSvg() {
  // Simple clean “pin” shape, filled, inherits color via currentColor
  return (
    <svg className="jobsPinIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 2c-.4 0-.8.2-1 .6l-1.3 2.4c-.2.4-.1.9.2 1.2l1.6 1.6-4.9 4.9-1.6-1.6c-.3-.3-.8-.4-1.2-.2L3.9 13.2c-.7.4-.7 1.4 0 1.8l3.6 2.1L11 20.7c.4.7 1.4.7 1.8 0l1.3-2.4c.2-.4.1-.9-.2-1.2l-1.6-1.6 4.9-4.9 1.6 1.6c.3.3.8.4 1.2.2l2.4-1.3c.7-.4.7-1.4 0-1.8l-3.6-2.1L15.3 3.6c-.2-.4-.5-.6-.8-.6z" />
    </svg>
  );
}

export default function JobsListCard({ job, onOpen, onPin }: Props) {
  const titleLine = useMemo(() => {
    const name = (job.jobName ?? "").trim();
    const num = (job.jobNumber ?? "").trim();
    if (!name) return num;
    if (!num) return name;
    return `${name} — ${num}`;
  }, [job.jobName, job.jobNumber]);

  const addressLine = useMemo(() => (job.address ?? "").trim(), [job.address]);

  const left1 = useMemo(() => joinNamePhone(job.gc, ""), [job.gc]);
  const left2 = useMemo(() => joinNamePhone(job.gcpm, job.gcpmContact), [job.gcpm, job.gcpmContact]);
  const left3 = useMemo(() => (job.contractAmount ?? "").trim(), [job.contractAmount]);

  const right1 = useMemo(() => joinNamePhone(job.super, job.superContact), [job.super, job.superContact]);
  const right2 = useMemo(() => (job.pm ?? "").trim(), [job.pm]);

  const scopeLines = useMemo(() => (job.scopeLines ?? []).filter(Boolean), [job.scopeLines]);

  function LabelInline({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "baseline", color: "rgba(255,255,255,0.92)" }}>
        <div style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{label}:</div>
        <div style={{ minWidth: 0, wordBreak: "break-word" }}>{value}</div>
      </div>
    );
  }

  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(job.jobNumber)}
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
      <div className="jobsListCard">
        {/* Header row */}
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
            {addressLine ? <div style={{ fontSize: 12, opacity: 0.85 }}>{addressLine}</div> : null}
          </div>

          {job.pssInstallDate ? <div style={pillStyle}>{job.pssInstallDate}</div> : null}
        </div>

        {/* Divider */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }} />

        {/* Body: 3 columns */}
        <div
          style={{
            marginTop: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 0.9fr",
            gap: 14,
          }}
        >
          {/* Left */}
          <div style={{ display: "grid", gap: 10 }}>
            <LabelInline label="GC" value={left1} />
            <LabelInline label="GCPM" value={left2} />
            <LabelInline label="Contract" value={left3 || "—"} />
          </div>

          {/* Right */}
          <div style={{ display: "grid", gap: 10 }}>
            <LabelInline label="Super" value={right1} />
            <LabelInline label="PM" value={right2} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              <div style={pillStyle}>Contract</div>
              <div style={pillStyle}>Submittals</div>
            </div>
          </div>

          {/* Scope */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.10)", paddingLeft: 14, minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 12, marginBottom: 8, color: "rgba(255,255,255,0.92)" }}>
              Scope:
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              {(scopeLines.length ? scopeLines : ["—", "—", "—"]).map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    color: "rgba(255,255,255,0.88)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pin button */}
        <div className="jobsListCardPinSlot">
          <button
            type="button"
            className="jobsPinBtn"
            aria-label="Pin job"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onPin) onPin(job.jobNumber);
              else console.log("pin", job.jobNumber);
            }}
          >
            <PinSvg />
          </button>
        </div>
      </div>
    </button>
  );
}