import React from "react";

type Props = {
  onUserSettings: () => void;
  onNotifications: () => void;
};

export default function OptionsPage({ onUserSettings, onNotifications }: Props) {
  return (
    <div className="dashDrawerStack" aria-label="Account options">
      <button type="button" className="dashDrawerNavBtn" onClick={onUserSettings}>
        <div className="dashDrawerNavMain">User Settings</div>
        <div className="dashDrawerNavSub">Profile preferences and account options</div>
      </button>

      <button type="button" className="dashDrawerNavBtn" onClick={onNotifications}>
        <div className="dashDrawerNavMain">Notifications</div>
        <div className="dashDrawerNavSub">Alerts, updates, and message preferences</div>
      </button>

      <div className="dashDrawerHint">
        These pages are stubs for now. We’ll wire the real settings later.
      </div>
    </div>
  );
}