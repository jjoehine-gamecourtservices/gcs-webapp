import React, { useMemo } from "react";
import { Pin, PinOff } from "lucide-react";
import type { JobListItem } from "../state/useJobsAll";

type PinMode = "pin" | "unpin" | "hidden";

type Props = {
  job: JobListItem;
  onOpen: (jobNumber: string) => void;
  pinMode?: PinMode;
  onPin?: (jobNumber: string) => void;
  onUnpin?: (jobNumber: string) => void;
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

export default function JobsListCard({ job, onOpen, pinMode = "pin", onPin, onUnpin }: Props) {
  const titleLine = useMemo(() => {
    const name = (job.jobName ?? "").trim();
    const num = (job.jobNumber ?? "").trim();
    if (!name) return num || "-";
    if (!num) return name;
    return `${name} - ${num}`;
  }, [job.jobName, job.jobNumber]);

  const addressLine = useMemo(() => normalizeDisplay(job.address), [job.address]);

  const left1 = useMemo(() => joinNamePhone(job.gc, ""), [job.gc]);
  const left2 = useMemo(() => joinNamePhone(job.gcpm, job.gcpmContact), [job.gcpm, job.gcpmContact]);
  const left3 = useMemo(() => normalizeDisplay(job.contractAmount), [job.contractAmount]);

  const right1 = useMemo(() => joinNamePhone(job.super, job.superContact), [job.super, job.superContact]);
  const right2 = useMemo(() => normalizeDisplay(job.pm), [job.pm]);

  const installDate = useMemo(() => normalizeDisplay(job.pssInstallDate), [job.pssInstallDate]);

  const scopeLines = useMemo(() => {
    const clean = (job.scopeLines ?? []).map((x) => (x ?? "").trim()).filter(Boolean);
    return clean.length ? clean : ["-", "-", "-"];
  }, [job.scopeLines]);

  function LabelInline({ label, value }: { label: string; value: string }) {
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

  const showPinButton = pinMode !== "hidden";
  const pinAria = pinMode === "unpin" ? "Unpin job" : "Pin job";

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
            <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 4 }}>{titleLine}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{addressLine}</div>
          </div>

          <div style={pillStyle}>{installDate}</div>
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
            marginTop: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 0.9fr",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <LabelInline label="GC" value={left1} />
            <LabelInline label="GCPM" value={left2} />
            <LabelInline label="Contract" value={left3} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <LabelInline label="Super" value={right1} />
            <LabelInline label="PM" value={right2} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              <div style={pillStyle}>Contract</div>
              <div style={pillStyle}>Submittals</div>
            </div>
          </div>

          <div
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.10)",
              paddingLeft: 14,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 950,
                fontSize: 12,
                marginBottom: 8,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              Scope:
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              {scopeLines.map((line, idx) => (
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

        {showPinButton && (
          <div className="jobsListCardPinSlot">
            <button
              type="button"
              className="jobsPinBtn"
              aria-label={pinAria}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (pinMode === "pin") {
                  if (onPin) onPin(job.jobNumber);
                  return;
                }

                if (pinMode === "unpin") {
                  if (onUnpin) onUnpin(job.jobNumber);
                }
              }}
            >
              {pinMode === "unpin" ? <PinOff size={18} strokeWidth={2} /> : <Pin size={18} strokeWidth={2} />}
            </button>
          </div>
        )}
      </div>
    </button>
  );
}