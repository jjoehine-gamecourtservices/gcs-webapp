import React from "react";

type Props = {
  onBack: () => void;
};

export default function NotificationsPage({ onBack }: Props) {
  return (
    <div className="dashDrawerStack" aria-label="Notifications">
      <button type="button" className="dashDrawerBackBtn" onClick={onBack}>
        ← Back
      </button>

      <div className="dashDrawerStubCard">
        <div className="dashDrawerStubTitle">Notifications (Stub)</div>
        <div className="dashDrawerStubText">
          We will build this after we finalize header + admin architecture.
        </div>
      </div>
    </div>
  );
}