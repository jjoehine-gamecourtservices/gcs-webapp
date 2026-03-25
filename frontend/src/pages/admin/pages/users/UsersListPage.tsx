import React, { useCallback, useEffect, useMemo, useState } from "react";
import UsersTable from "./UsersTable";
import type { AdminUserRow, PatchUserRequest } from "./users.types";
import { createUser, deleteUser, listUsers, patchUser, resetUserPassword } from "./users.api";

type Props = {
  userIsMaster: boolean;
};

export default function UsersListPage({ userIsMaster }: Props) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const busyUserIds = useMemo(() => busyIds, [busyIds]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsMaster, setNewIsMaster] = useState(false);

  const markBusy = useCallback((id: number, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateBusy(false);
    setCreateMsg("");
    setNewEmail("");
    setNewPassword("");
    setNewIsMaster(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");

    const r = await listUsers();
    if (!r.ok || !r.data) {
      setRows([]);
      setMsg(`✖ Failed to load users: HTTP ${r.status}: ${r.text}`);
      setLoading(false);
      return;
    }

    const sorted = [...r.data].sort((a, b) => {
      if (a.is_master !== b.is_master) return a.is_master ? -1 : 1;
      return a.email.localeCompare(b.email);
    });

    setRows(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onCreate = useCallback(async () => {
    setCreateMsg("");
    const email = newEmail.trim();
    const password = newPassword.trim();

    if (!email || !password) {
      setCreateMsg("✖ Email and password are required.");
      return;
    }

    if (newIsMaster) {
      const ok = window.confirm(
        `Create MASTER account for:\n\n${email}\n\nMaster accounts can manage users and permissions. Continue?`
      );
      if (!ok) return;
    }

    setCreateBusy(true);
    try {
      const r = await createUser({
        email,
        password,
        is_master: newIsMaster ? true : undefined,
      });

      if (!r.ok || !r.data) {
        setCreateMsg(`✖ Create failed: HTTP ${r.status}: ${r.text}`);
        return;
      }

      setMsg(`✓ Created: ${r.data.email} (${r.data.is_master ? "Master" : "User"})`);
      closeCreate();
      await load();
    } finally {
      setCreateBusy(false);
    }
  }, [closeCreate, load, newEmail, newIsMaster, newPassword]);

  const onToggleActive = useCallback(
    async (id: number, nextActive: boolean) => {
      setMsg("");
      markBusy(id, true);
      try {
        const r = await patchUser(id, { is_active: nextActive });
        if (!r.ok || !r.data) {
          setMsg(`✖ Update failed: HTTP ${r.status}: ${r.text}`);
          return;
        }
        setMsg(`✓ ${r.data.email} is now ${r.data.is_active ? "Active" : "Disabled"}.`);
        await load();
      } finally {
        markBusy(id, false);
      }
    },
    [load, markBusy]
  );

  const onSaveProfile = useCallback(
    async (id: number, patch: PatchUserRequest) => {
      setMsg("");
      markBusy(id, true);
      try {
        const r = await patchUser(id, patch);
        if (!r.ok || !r.data) {
          setMsg(`✖ Save failed: HTTP ${r.status}: ${r.text}`);
          return { ok: false as const, message: `HTTP ${r.status}: ${r.text}` };
        }
        setMsg(`✓ Saved profile for ${r.data.email}.`);
        await load();
        return { ok: true as const, message: "Saved." };
      } finally {
        markBusy(id, false);
      }
    },
    [load, markBusy]
  );

  const onResetPassword = useCallback(
    async (id: number, newPasswordValue: string) => {
      setMsg("");
      const pwd = newPasswordValue.trim();
      if (!pwd) {
        setMsg("✖ Password is required.");
        return;
      }

      markBusy(id, true);
      try {
        const r = await resetUserPassword(id, { password: pwd });
        if (!r.ok || !r.data) {
          setMsg(`✖ Reset password failed: HTTP ${r.status}: ${r.text}`);
          return;
        }
        setMsg(`✓ Password updated for ${r.data.email}.`);
      } finally {
        markBusy(id, false);
      }
    },
    [markBusy]
  );

  const onDelete = useCallback(
    async (id: number) => {
      setMsg("");
      markBusy(id, true);
      try {
        const r = await deleteUser(id);
        if (!r.ok || !r.data) {
          setMsg(`✖ Delete failed: HTTP ${r.status}: ${r.text}`);
          return;
        }
        setMsg("✓ User deleted.");
        await load();
      } finally {
        markBusy(id, false);
      }
    },
    [load, markBusy]
  );

  return (
    <>
      {msg ? (
        <div className="dashCard" style={{ marginBottom: 12 }}>
          <div className="dashMuted">{msg}</div>
        </div>
      ) : null}

      <div className="dashCard">
        <div className="dashCardHead">
          <div>
            <div className="dashCardTitle">Users</div>
            <div className="dashMuted">
              Enable/disable accounts, edit profile details, reset passwords, or delete users.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="dashMiniPill">{loading ? "Loading..." : `${rows.length} users`}</div>

            {userIsMaster ? (
              <button
                type="button"
                className="dashMiniPill"
                style={{ cursor: "pointer" }}
                onClick={() => setCreateOpen(true)}
                title="Create a new user"
              >
                Create User
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div className="dashMuted">Loading users…</div>
          ) : (
            <UsersTable
              rows={rows}
              busyUserIds={busyUserIds}
              onToggleActive={onToggleActive}
              onSaveProfile={onSaveProfile}
              onResetPassword={onResetPassword}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>

      {createOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreate();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "40px 16px",
            overflowY: "auto",
            zIndex: 9999,
          }}
        >
          <div
            className="dashCard"
            style={{
              width: "min(720px, 100%)",
              boxSizing: "border-box",
              maxHeight: "calc(100vh - 80px)",
              overflowY: "auto",
            }}
          >
            <div className="dashCardHead">
              <div>
                <div className="dashCardTitle">Create User</div>
                <div className="dashMuted">Requires email + password.</div>
              </div>

              <button
                type="button"
                className="dashMiniPill"
                onClick={closeCreate}
                style={{ cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            {createMsg ? (
              <div className="dashMuted" style={{ marginTop: 10 }}>
                {createMsg}
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@gamecourtservices.com"
                disabled={createBusy}
                style={inputStyle}
              />

              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Temporary password"
                disabled={createBusy}
                style={inputStyle}
              />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="dashMuted">Master account</span>
                  <ToggleSwitch checked={newIsMaster} disabled={createBusy} onChange={setNewIsMaster} />
                </div>

                <button
                  type="button"
                  className="dashMiniPill"
                  disabled={createBusy || newEmail.trim().length === 0 || newPassword.trim().length === 0}
                  onClick={onCreate}
                  style={{
                    cursor:
                      createBusy || newEmail.trim().length === 0 || newPassword.trim().length === 0
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      createBusy || newEmail.trim().length === 0 || newPassword.trim().length === 0 ? 0.65 : 1,
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: checked ? "rgba(80, 200, 120, 0.55)" : "rgba(255,255,255,0.10)",
        position: "relative",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        transition: "background 120ms ease",
      }}
      title={checked ? "Master enabled" : "Master disabled"}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 24 : 3,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "rgba(255,255,255,0.90)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          transition: "left 120ms ease",
        }}
      />
    </button>
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