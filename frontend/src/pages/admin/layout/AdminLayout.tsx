import React from "react";
import type { AdminNavState } from "../admin.types";

type Props = {
  title: string;
  subtitle?: string;
  page: AdminNavState;
  onGoHome: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function AdminLayout({ title, subtitle, page, onGoHome, actions, children }: Props) {
  const showBack = page.id !== "home";

  return (
    <div
      className="dashCard"
      style={{
        // Make this a proper scroll container layout when embedded in a dashboard flex shell.
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0, // CRITICAL for overflow scrolling inside flex
      }}
    >
      <div className="dashCardHead" style={{ flex: "0 0 auto" }}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {showBack ? (
                <>
                  <button
                    type="button"
                    onClick={onGoHome}
                    className="dashMiniPill"
                    style={{ cursor: "pointer" }}
                    aria-label="Back to Admin Home"
                    title="Back"
                  >
                    Back
                  </button>

                  {/* Actions go right next to Back on sub-pages */}
                  {actions ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{actions}</div> : null}
                </>
              ) : null}

              <div className="dashCardTitle">{title}</div>
            </div>

            {subtitle ? <div className="dashMuted">{subtitle}</div> : null}
          </div>

          {/* On the Admin home page (no back), if you ever pass actions, put them on the right */}
          {!showBack && actions ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{actions}</div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          // This is the scroll region
          flex: "1 1 auto",
          minHeight: 0, // CRITICAL: allows this area to be smaller than its content so it can scroll
          overflowY: "auto",
          marginTop: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}