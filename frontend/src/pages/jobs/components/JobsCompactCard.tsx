import React, { useMemo } from "react";
import { ChevronUp, ChevronDown, PinOff } from "lucide-react";
import type { JobListItem } from "../state/useJobsAll";

type Props = {
  job: JobListItem;
  onOpen: (jobNumber: string) => void;
  onUnpin?: (jobNumber: string) => void;
  onMoveUp?: (jobNumber: string) => void;
  onMoveDown?: (jobNumber: string) => void;
};

function normalizeDisplay(value?: string): string {
  const v = (value ?? "").trim();
  return v || "-";
}

function joinNamePhone(name?: string, phone?: string): string {
  const n = (name ?? "").trim();
  const p = (phone ?? "").trim();
  if (!n && !p) return "-";
  if (n && !p) return n;
  if (!n && p) return p;
  return `${n} - ${p}`;
}

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.82)" }}>{label}:</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: "16px", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}

export default function JobsCompactCard({ job, onOpen, onUnpin, onMoveUp, onMoveDown }: Props) {
  const titleLine = useMemo(() => {
    const name = (job.jobName ?? "").trim();
    const num = (job.jobNumber ?? "").trim();
    if (!name) return num || "-";
    if (!num) return name;
    return `${name} - ${num}`;
  }, [job.jobName, job.jobNumber]);

  const addressLine = useMemo(() => normalizeDisplay(job.address), [job.address]);
  const installDate = useMemo(() => normalizeDisplay(job.pssInstallDate), [job.pssInstallDate]);
  const gc = useMemo(() => joinNamePhone(job.gc, ""), [job.gc]);
  const gcpm = useMemo(() => joinNamePhone(job.gcpm, job.gcpmContact), [job.gcpm, job.gcpmContact]);
  const superLine = useMemo(() => joinNamePhone(job.super, job.superContact), [job.super, job.superContact]);
  const pm = useMemo(() => normalizeDisplay(job.pm), [job.pm]);
  const contractAmount = useMemo(() => normalizeDisplay(job.contractAmount), [job.contractAmount]);

  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    textAlign: "center",
    lineHeight: "12px",
  };

  const rightTextStyle: React.CSSProperties = {
    fontSize: 13,
    color: "rgba(255,255,255,0.92)",
    textAlign: "right",
    lineHeight: "16px",
    maxWidth: 180,
    wordBreak: "break-word",
  };

  const contractAmountStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "rgba(255,255,255,0.92)",
    textAlign: "right",
    lineHeight: "16px",
    maxWidth: 180,
    wordBreak: "break-word",
  };

  const showControls = typeof onUnpin === "function";

  const arrowButtonStyle: React.CSSProperties = {
    width: 26,
    height: 16,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "rgba(255,255,255,0.92)",
    padding: 0,
  };

  const unpinButtonStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "rgba(255,255,255,0.92)",
    padding: 0,
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
            <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 6 }}>{titleLine}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{addressLine}</div>
          </div>

          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
            <div style={pillStyle}>{installDate}</div>
            <div style={rightTextStyle}>{pm}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.10)",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <FieldBlock label="GC" value={gc} />
            <FieldBlock label="GCPM" value={gcpm} />
            <FieldBlock label="Super" value={superLine} />
          </div>

          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div style={contractAmountStyle}>{contractAmount}</div>
            <div style={pillStyle}>Contract</div>
            <div style={pillStyle}>Submittals</div>
          </div>
        </div>

        {showControls && (
          <div className="jobsListCardPinSlot">
            <div
              style={{
                position: "absolute",
                right: 10,
                bottom: -10,
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <button
                  type="button"
                  aria-label="Move pinned job up"
                  style={arrowButtonStyle}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onMoveUp) onMoveUp(job.jobNumber);
                  }}
                >
                  <ChevronUp size={12} strokeWidth={2} />
                </button>

                <button
                  type="button"
                  aria-label="Move pinned job down"
                  style={arrowButtonStyle}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onMoveDown) onMoveDown(job.jobNumber);
                  }}
                >
                  <ChevronDown size={12} strokeWidth={2} />
                </button>
              </div>

              <button
                type="button"
                aria-label="Unpin job"
                style={unpinButtonStyle}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onUnpin) onUnpin(job.jobNumber);
                }}
              >
                <PinOff size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}