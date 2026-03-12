import React, { useMemo } from "react";
import { X, Pin } from "lucide-react";
import type { JobListItem } from "../state/useJobsAll";

type Props = {
  job: JobListItem;
  onOpen: (jobNumber: string) => void;
  onRemove?: (jobNumber: string) => void;
  onPin?: (jobNumber: string) => void;
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
    <div style={{ display: "grid", gap: 1 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: "rgba(255,255,255,0.82)",
          lineHeight: "10px",
        }}
      >
        {label}:
      </div>

      <div
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.92)",
          lineHeight: "11px",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function JobsRecentCard({ job, onOpen, onRemove, onPin }: Props) {
  const titleLine = useMemo(() => {
    const name = (job.jobName ?? "").trim();
    const num = (job.jobNumber ?? "").trim();
    if (!name) return num || "-";
    if (!num) return name;
    return `${name} - ${num}`;
  }, [job.jobName, job.jobNumber]);

  const addressParts = useMemo(() => {
    const raw = (job.address ?? "").trim();
    if (!raw) return { line1: "-", line2: "" };

    const i = raw.indexOf(",");
    if (i < 0) return { line1: raw, line2: "" };

    return {
      line1: raw.slice(0, i).trim() || "-",
      line2: raw.slice(i + 1).trim(),
    };
  }, [job.address]);

  const gc = useMemo(() => joinNamePhone(job.gc, ""), [job.gc]);
  const gcpm = useMemo(() => joinNamePhone(job.gcpm, job.gcpmContact), [job.gcpm, job.gcpmContact]);
  const superLine = useMemo(() => joinNamePhone(job.super, job.superContact), [job.super, job.superContact]);
  const pm = useMemo(() => normalizeDisplay(job.pm), [job.pm]);
  const installDate = useMemo(() => normalizeDisplay(job.pssInstallDate), [job.pssInstallDate]);
  const contractAmount = useMemo(() => normalizeDisplay(job.contractAmount), [job.contractAmount]);

  const pillStyle: React.CSSProperties = {
    fontSize: 9,
    whiteSpace: "nowrap",
    padding: "2px 6px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    textAlign: "center",
    lineHeight: "10px",
  };

  const rightTextStyle: React.CSSProperties = {
    fontSize: 10,
    color: "rgba(255,255,255,0.92)",
    textAlign: "right",
    lineHeight: "11px",
  };

  const addrLineStyle: React.CSSProperties = {
    fontSize: 9,
    opacity: 0.85,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "10px",
  };

  const actionButtonStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "rgba(255,255,255,0.92)",
    padding: 0,
  };

  const contractAmountStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    color: "rgba(255,255,255,0.92)",
    lineHeight: "11px",
    textAlign: "right",
  };

  const showRemove = typeof onRemove === "function";
  const showPin = typeof onPin === "function";

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
      <div
        className="jobsListCard"
        style={{
          position: "relative",
          padding: 8,
          width: 280,
          height: 140,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 6,
              alignItems: "start",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 950,
                  fontSize: 10,
                  marginBottom: 3,
                  lineHeight: "11px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {titleLine}
              </div>

              <div style={{ display: "grid", gap: 1 }}>
                <div style={addrLineStyle}>{addressParts.line1}</div>
                <div style={{ ...addrLineStyle, opacity: addressParts.line2 ? 0.85 : 0 }}>
                  {addressParts.line2 || " "}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 2, justifyItems: "end" }}>
              <div style={pillStyle}>{installDate}</div>
              <div style={rightTextStyle}>{pm}</div>
            </div>
          </div>

          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px solid rgba(255,255,255,0.10)",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
              alignItems: "start",
              paddingBottom: 18,
            }}
          >
            <div style={{ display: "grid", gap: 5 }}>
              <FieldBlock label="GC" value={gc} />
              <FieldBlock label="GCPM" value={gcpm} />
              <FieldBlock label="Super" value={superLine} />
            </div>

            <div style={{ display: "grid", gap: 5, justifyItems: "end" }}>
              <div style={contractAmountStyle}>{contractAmount}</div>
              <div style={pillStyle}>Contract</div>
              <div style={pillStyle}>Submittals</div>
            </div>
          </div>
        </div>

        {(showPin || showRemove) && (
          <div
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            {showPin && (
              <button
                type="button"
                aria-label="Pin job"
                style={actionButtonStyle}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPin(job.jobNumber);
                }}
              >
                <Pin size={11} strokeWidth={2} />
              </button>
            )}

            {showRemove && (
              <button
                type="button"
                aria-label="Remove recent job"
                style={actionButtonStyle}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(job.jobNumber);
                }}
              >
                <X size={11} strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>
    </button>
  );
}