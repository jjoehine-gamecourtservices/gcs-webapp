import React, { useMemo, useState } from "react";
import type { AdminUserRow } from "./users.types";

type Props = {
  rows: AdminUserRow[];
  busyUserIds?: ReadonlySet<number>;
  onToggleActive: (id: number, nextActive: boolean) => void;
  onResetPassword: (id: number, newPassword: string) => void;
  onDelete: (id: number) => void;
};

export default function UsersTable({ rows, busyUserIds, onToggleActive, onResetPassword, onDelete }: Props) {
  const [pwById, setPwById] = useState<Record<number, string>>({});
  const busy = useMemo(() => busyUserIds ?? new Set<number>(), [busyUserIds]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "10px 8px" }}>Email</th>
            <th style={{ textAlign: "left", padding: "10px 8px" }}>Role</th>
            <th style={{ textAlign: "left", padding: "10px 8px" }}>Status</th>
            <th style={{ textAlign: "left", padding: "10px 8px" }}>Profile</th>
            <th style={{ textAlign: "left", padding: "10px 8px" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const isBusy = busy.has(r.id);
            const roleLabel = r.is_master ? "Master" : "User";
            const statusLabel = r.is_active ? "Active" : "Disabled";
            const pwVal = pwById[r.id] ?? "";

            return (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={{ padding: "10px 8px" }}>{r.email}</td>

                <td style={{ padding: "10px 8px" }}>
                  <span className="dashMiniPill">{roleLabel}</span>
                </td>

                <td style={{ padding: "10px 8px" }}>
                  <span className="dashMiniPill">{statusLabel}</span>
                </td>

                <td style={{ padding: "10px 8px" }}>
                  <span className="dashMuted">{r.profile_key ?? "—"}</span>
                </td>

                <td style={{ padding: "10px 8px" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="dashMiniPill"
                      style={{ cursor: isBusy ? "not-allowed" : "pointer", opacity: isBusy ? 0.65 : 1 }}
                      disabled={isBusy}
                      onClick={() => onToggleActive(r.id, !r.is_active)}
                      title={r.is_active ? "Disable this account" : "Enable this account"}
                    >
                      {r.is_active ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      className="dashMiniPill"
                      disabled={isBusy || r.is_master}
                      style={{
                        cursor: isBusy || r.is_master ? "not-allowed" : "pointer",
                        opacity: isBusy || r.is_master ? 0.55 : 1,
                      }}
                      onClick={() => {
                        const ok = window.confirm(
                          `Delete user "${r.email}"?\n\nThis permanently removes the user. This cannot be undone.`
                        );
                        if (ok) onDelete(r.id);
                      }}
                      title={r.is_master ? "Master users cannot be deleted." : "Delete user"}
                    >
                      Delete
                    </button>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        value={pwVal}
                        onChange={(e) => setPwById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="New password"
                        disabled={isBusy}
                        style={{
                          width: 220,
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(0,0,0,0.18)",
                          color: "var(--text)",
                          outline: "none",
                          fontSize: 13,
                        }}
                      />

                      <button
                        type="button"
                        className="dashMiniPill"
                        disabled={isBusy || pwVal.trim().length === 0}
                        style={{
                          cursor: isBusy || pwVal.trim().length === 0 ? "not-allowed" : "pointer",
                          opacity: isBusy || pwVal.trim().length === 0 ? 0.65 : 1,
                        }}
                        onClick={() => onResetPassword(r.id, pwVal)}
                        title="Set the new password"
                      >
                        Set Password
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}