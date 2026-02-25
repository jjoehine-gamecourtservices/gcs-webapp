import React from "react";

type Props = {
  onBack: () => void;
};

export default function UserSettingsPage({ onBack }: Props) {
  return (
    <div className="dashDrawerStack" aria-label="User settings">
      <button type="button" className="dashDrawerBackBtn" onClick={onBack}>
        ← Back
      </button>

      <div className="dashDrawerStubCard">
        <div className="dashDrawerStubTitle">User Settings (Stub)</div>
        <div className="dashDrawerStubText">
          We will build this after we finalize header + admin architecture.
        </div>
      </div>
    </div>
  );
}