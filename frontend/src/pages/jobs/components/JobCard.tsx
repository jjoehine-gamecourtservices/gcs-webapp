import React from "react";
import type { JobCardModel } from "../jobs.types";

type Props = {
  job: JobCardModel;
  onOpen: (jobId: string) => void;
};

export default function JobCard({ job, onOpen }: Props) {
  const jobNumberLabel = job.jobNumber ? job.jobNumber : job.id;

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
      aria-label={`Open job ${jobNumberLabel}`}
    >
      <div
        style={{
          borderRadius: 14,
          padding: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div className="dashCardTitle" style={{ marginBottom: 4 }}>
              {job.jobName}
            </div>
            <div className="dashMuted">{jobNumberLabel}</div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            Open
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <div>
            <div className="dashStatLabel">Address</div>
            <div className="dashStatValue">{job.address ?? "None"}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="dashStatLabel">General Contractor</div>
              <div className="dashStatValue">{job.generalContractor ?? "None"}</div>
            </div>

            <div>
              <div className="dashStatLabel">PM</div>
              <div className="dashStatValue">{job.pm ?? "None"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="dashStatLabel">GCPM</div>
              <div className="dashStatValue">{job.gcpm ?? "None"}</div>
            </div>

            <div>
              <div className="dashStatLabel">GCPM Contact</div>
              <div className="dashStatValue">{job.gcpmContact ?? "None"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="dashStatLabel">Installer</div>
              <div className="dashStatValue">{job.installer ?? "None"}</div>
            </div>

            <div>
              <div className="dashStatLabel">Installer Contact</div>
              <div className="dashStatValue">{job.installerContact ?? "None"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="dashStatLabel">Start Date</div>
              <div className="dashStatValue">{job.startDate ?? "None"}</div>
            </div>

            <div>
              <div className="dashStatLabel">End Date</div>
              <div className="dashStatValue">{job.endDate ?? "None"}</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}