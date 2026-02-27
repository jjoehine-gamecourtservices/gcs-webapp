import React from "react";

type Props = {
  jobId: string;
  onBack: () => void;
};

export default function JobOverviewPage({ jobId, onBack }: Props) {
  return (
    <div className="dashCard">
      <div className="dashCardHead">
        <div>
          <div className="dashCardTitle">Job Overview</div>
          <div className="dashMuted">Placeholder page (not wired yet).</div>
        </div>

        <div className="dashFilters">
          <button className="dashBtn" onClick={onBack} type="button">
            Back to all
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }} className="dashMuted">
        Selected job id: <span style={{ fontFamily: "monospace" }}>{jobId}</span>
      </div>

      <div style={{ marginTop: 12 }} className="dashMuted">
        Coming soon: full job overview, master JSON merge, and richer Monday fields.
      </div>
    </div>
  );
}