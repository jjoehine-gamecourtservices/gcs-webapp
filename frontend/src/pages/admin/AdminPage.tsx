import React, { useCallback, useMemo, useState } from "react";
import AdminLayout from "./layout/AdminLayout";
import type { AdminNavState } from "./admin.types";
import type { PermissionSet, PermissionKey } from "./permissions/permissions.types";

import AdminHomePage from "./pages/home/AdminHomePage";
import PermissionsPage from "./pages/permissions/PermissionsPage";
import UsersListPage from "./pages/users/UsersListPage";
import { createUser } from "./pages/users/users.api";

type Props = {
  userIsMaster: boolean;
  perms?: PermissionSet;
};

export default function AdminPage({ userIsMaster, perms }: Props) {
  const [page, setPage] = useState<AdminNavState>({ id: "home" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsMaster, setNewIsMaster] = useState(false);

  // Forces UsersListPage to remount (and re-fetch) after a successful user creation.
  const [usersListNonce, setUsersListNonce] = useState(0);

  const effectivePerms: PermissionSet = useMemo(() => {
    return perms ?? (new Set<PermissionKey>() as PermissionSet);
  }, [perms]);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateBusy(false);
    setCreateMsg("");
    setNewEmail("");
    setNewPassword("");
    setNewIsMaster(false);
  }, []);

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
        // Keep behavior: omit unless true (backend should default false if missing).
        is_master: newIsMaster ? true : undefined,
      });

      if (!r.ok || !r.data) {
        setCreateMsg(`✖ Create failed: HTTP ${r.status}: ${r.text}`);
        return;
      }

      setCreateMsg(`✓ Created: ${r.data.email} (${r.data.is_master ? "Master" : "User"})`);

      // Reset fields
      setNewEmail("");
      setNewPassword("");
      setNewIsMaster(false);

      // Refresh Accounts list instantly (without requiring a page reload)
      setUsersListNonce((n) => n + 1);
    } finally {
      setCreateBusy(false);
    }
  }, [newEmail, newPassword, newIsMaster]);

  const title = useMemo(() => {
    if (page.id === "users:list") return "Accounts";
    if (page.id === "permissions") return "Permissions";
    return "Admin";
  }, [page.id]);

  const subtitle = useMemo(() => {
    if (page.id === "users:list") return "Manage accounts.";
    if (page.id === "permissions") return "Manage module permissions.";
    return "Manage users and module permissions.";
  }, [page.id]);

  const actions = useMemo(() => {
    if (!userIsMaster) return null;

    return (
      <button
        type="button"
        className="dashMiniPill"
        style={{ cursor: "pointer" }}
        onClick={() => setCreateOpen(true)}
        title="Create a new user"
      >
        Create User
      </button>
    );
  }, [userIsMaster]);

  return (
    <AdminLayout
      title={title}
      subtitle={subtitle}
      page={page}
      onGoHome={() => setPage({ id: "home" })}
      actions={actions}
    >
      {page.id === "home" ? <AdminHomePage perms={effectivePerms} onNavigate={(to) => setPage(to)} /> : null}

      {page.id === "users:list" ? <UsersListPage key={usersListNonce} /> : null}
      {page.id === "permissions" ? <PermissionsPage /> : null}

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
              <button type="button" className="dashMiniPill" onClick={closeCreate} style={{ cursor: "pointer" }}>
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
    </AdminLayout>
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