import React from "react";

export default function TasksPage() {
  return (
    <div className="dashCard">
      <div className="dashCardHead">
        <div>
          <div className="dashCardTitle">Tasks</div>
          <div className="dashMuted">Not started yet.</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }} className="dashMuted">
        Coming soon.
      </div>
    </div>
  );
}