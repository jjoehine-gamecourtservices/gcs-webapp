import React, { useEffect, useMemo, useState } from "react";
import type { AdminUserRow, PatchUserRequest } from "./users.types";

type Props = {
  rows: AdminUserRow[];
  busyUserIds?: ReadonlySet<number>;
  onToggleActive: (id: number, nextActive: boolean) => void;
  onSaveProfile: (id: number, patch: PatchUserRequest) => Promise<{ ok: boolean; message: string }>;
  onResetPassword: (id: number, newPassword: string) => void;
  onDelete: (id: number) => void;
};

export default function UsersTable({
  rows,
  busyUserIds,
  onToggleActive,
  onSaveProfile,
  onResetPassword,
  onDelete,
}: Props) {
  const busy = useMemo(() => busyUserIds ?? new Set<number>(), [busyUserIds]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editPw, setEditPw] = useState("");

  const [saveMsg, setSaveMsg] = useState<string>("");

  const editingRow = useMemo(() => {
    if (editingId == null) return null;
    return rows.find((r) => r.id === editingId) ?? null;
  }, [editingId, rows]);

  const isEditingBusy = useMemo(() => {
    if (editingId == null) return false;
    return busy.has(editingId);
  }, [busy, editingId]);

  useEffect(() => {
    // If the currently edited user disappears (filtered list, etc.), close modal.
    if (editingId == null) return;
    if (!rows.some((r) => r.id === editingId)) setEditingId(null);
  }, [editingId, rows]);

  function openEdit(r: AdminUserRow) {
    setSaveMsg("");
    setEditingId(r.id);
    setEditEmail((r.email ?? "").trim());
    setEditName((r.name ?? "").trim());
    setEditPhone((r.phone ?? "").trim());
    setEditPosition((r.position ?? "").trim());
    setEditPw("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditPw("");
    setSaveMsg("");
  }

  async function saveProfile() {
    if (!editingRow) return;

    setSaveMsg("");

    const patch: PatchUserRequest = {
      email: editEmail.trim() || editingRow.email,
      name: editName.trim() || null,
      phone: editPhone.trim() || null,
      position: editPosition.trim() || null,
    };

    const r = await onSaveProfile(editingRow.id, patch);
    setSaveMsg(r.ok ? "✓ Saved." : `✖ Save failed: ${r.message}`);

    if (r.ok) {
      closeEdit();
    }
  }

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 8px", width: "44%" }}>Email</th>
              <th style={{ textAlign: "left", padding: "10px 8px", width: 120 }}>Role</th>
              <th style={{ textAlign: "left", padding: "10px 8px", width: 120 }}>Status</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const isBusy = busy.has(r.id);
              const roleLabel = r.is_master ? "Master" : "User";
              const statusLabel = r.is_active ? "Active" : "Disabled";

              return (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: "10px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.email}
                  </td>

                  <td style={{ padding: "10px 8px" }}>
                    <span className="dashMiniPill">{roleLabel}</span>
                  </td>

                  <td style={{ padding: "10px 8px" }}>
                    <span className="dashMiniPill">{statusLabel}</span>
                  </td>

                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        className="dashMiniPill"
                        style={{ cursor: isBusy ? "not-allowed" : "pointer", opacity: isBusy ? 0.65 : 1 }}
                        disabled={isBusy}
                        onClick={() => openEdit(r)}
                        title="Edit profile details and reset password"
                      >
                        Edit
                      </button>

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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingRow && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // click outside closes
            if (e.target === e.currentTarget) closeEdit();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="dashCard"
            style={{
              width: "min(720px, 100%)",
              boxSizing: "border-box",
            }}
          >
            <div className="dashCardHead">
              <div style={{ minWidth: 0 }}>
                <div className="dashCardTitle">Edit Profile</div>
                <div className="dashMuted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {editingRow.email}
                </div>
              </div>

              <button
                type="button"
                className="dashMiniPill"
                onClick={closeEdit}
                style={{ cursor: "pointer" }}
                title="Close"
              >
                Close
              </button>
            </div>

            {saveMsg ? (
              <div className="dashMuted" style={{ marginTop: 10 }}>
                {saveMsg}
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <div className="dashMuted">Email</div>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email"
                  disabled={isEditingBusy}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="dashMuted">Name</div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  disabled={isEditingBusy}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="dashMuted">Phone</div>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone"
                  disabled={isEditingBusy}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <div className="dashMuted">Position</div>
                <input
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  placeholder="Position"
                  disabled={isEditingBusy}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
              <button
                type="button"
                className="dashMiniPill"
                disabled={isEditingBusy}
                style={{ cursor: isEditingBusy ? "not-allowed" : "pointer", opacity: isEditingBusy ? 0.65 : 1 }}
                onClick={saveProfile}
                title="Save profile details to the server"
              >
                Save Profile
              </button>

              <span className="dashMuted">(Saved to the server — visible on all computers.)</span>
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="dashCardTitle" style={{ fontSize: 14 }}>
                Password Reset
              </div>
              <div className="dashMuted" style={{ marginTop: 4 }}>
                Set a new password for this account.
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <input
                  value={editPw}
                  onChange={(e) => setEditPw(e.target.value)}
                  placeholder="New password"
                  disabled={isEditingBusy}
                  style={{ ...inputStyle, width: 260 }}
                />

                <button
                  type="button"
                  className="dashMiniPill"
                  disabled={isEditingBusy || editPw.trim().length === 0}
                  style={{
                    cursor: isEditingBusy || editPw.trim().length === 0 ? "not-allowed" : "pointer",
                    opacity: isEditingBusy || editPw.trim().length === 0 ? 0.65 : 1,
                  }}
                  onClick={() => {
                    const pw = editPw.trim();
                    if (!pw) return;
                    onResetPassword(editingRow.id, pw);
                    setEditPw("");
                  }}
                  title="Set the new password"
                >
                  Set Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.18)",
  color: "var(--text)",
  outline: "none",
  fontSize: 13,
  boxSizing: "border-box",
};