import React, { useCallback, useMemo, useReducer, useState } from "react";
import type { User } from "../../types/user";

import type { AdminAction, AdminNavState } from "./admin.types";
import { adminInitialState, adminReducer } from "./state/admin.state";

import type { PermissionSet } from "./permissions/permissions.types";

import AdminLayout from "./layout/AdminLayout";
import AdminHomePage from "./pages/home/AdminHomePage";
import UsersListPage from "./pages/users/UsersListPage";
import PermissionsPage from "./pages/permissions/PermissionsPage";
import { createUser } from "./pages/users/users.api";

function resolvePermissions(user: User): PermissionSet {
  const perms = new Set<string>();

  if (Array.isArray(user.permissions)) {
    for (const p of user.permissions) perms.add(p);
  } else {
    if (user.is_master) perms.add("admin:access");
    if (user.is_master) {
      perms.add("users:read");
      perms.add("permissions:read");
    }
  }

  return perms as PermissionSet;
}

function renderAdminPage(
  page: AdminNavState,
  perms: PermissionSet,
  dispatch: React.Dispatch<AdminAction>,
  usersRefreshTick: number
) {
  switch (page.id) {
    case "home":
      return <AdminHomePage perms={perms} onNavigate={(to) => dispatch({ type: "NAV_TO", page: to })} />;

    case "users:list":
      return <UsersListPage refreshTick={usersRefreshTick} />;

    case "permissions":
      return <PermissionsPage />;

    default:
      return null;
  }
}

export default function AdminPage({ user }: { user: User }) {
  if (!user.is_master) {
    return (
      <div className="dashCard">
        <div className="dashCardHead">
          <div>
            <div className="dashCardTitle">Admin</div>
            <div className="dashMuted">You do not have access to this module.</div>
          </div>
          <div className="dashMiniPill">Not authorized</div>
        </div>
      </div>
    );
  }

  const perms = useMemo(() => resolvePermissions(user), [user]);
  const [page, dispatch] = useReducer(adminReducer, undefined, adminInitialState);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<string>("");

  const [usersRefreshTick, setUsersRefreshTick] = useState(0);

  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setNewEmail("");
    setNewPassword("");
    setCreateBusy(false);
    setCreateMsg("");
  }, []);

  const onCreateSubmit = useCallback(async () => {
    const email = newEmail.trim();
    const password = newPassword;

    if (!email || !password) {
      setCreateMsg("❌ Email and password are required.");
      return;
    }

    setCreateBusy(true);
    setCreateMsg("Creating user...");

    try {
      const r = await createUser({ email, password });
      if (!r.ok || !r.data) {
        setCreateMsg(`❌ Create failed: HTTP ${r.status}: ${r.text}`);
        return;
      }

      setCreateMsg(`✅ Created: ${r.data.email}`);
      setUsersRefreshTick((n) => n + 1);

      // Close after success
      setTimeout(() => closeCreate(), 350);
    } finally {
      setCreateBusy(false);
    }
  }, [closeCreate, newEmail, newPassword]);

  const roleLabel = user.is_master ? "Master" : "User";

  const headerActions =
    page.id === "users:list" ? (
      <>
        <button
          type="button"
          className="dashMiniPill"
          style={{ cursor: "pointer" }}
          onClick={() => setShowCreate(true)}
          title="Create a new user"
        >
          Create User
        </button>

        {showCreate ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create User"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "grid",
              placeItems: "center",
              zIndex: 1000,
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeCreate();
            }}
          >
            <div
              className="dashCard"
              style={{
                width: "min(720px, 96vw)",
                maxHeight: "90vh",
                overflow: "auto",
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

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@gamecourtservices.com"
                  disabled={createBusy}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.18)",
                    color: "var(--text)",
                    outline: "none",
                    fontSize: 14,
                  }}
                />

                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Temporary password"
                  disabled={createBusy}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.18)",
                    color: "var(--text)",
                    outline: "none",
                    fontSize: 14,
                  }}
                />

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="dashMiniPill"
                    onClick={onCreateSubmit}
                    disabled={createBusy || newEmail.trim().length === 0 || newPassword.trim().length === 0}
                    style={{
                      cursor:
                        createBusy || newEmail.trim().length === 0 || newPassword.trim().length === 0
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        createBusy || newEmail.trim().length === 0 || newPassword.trim().length === 0 ? 0.65 : 1,
                    }}
                  >
                    {createBusy ? "Creating..." : "Create"}
                  </button>

                  {createMsg ? <span className="dashMuted">{createMsg}</span> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </>
    ) : null;

  return (
    <div>
      <div className="dashCard" style={{ marginBottom: 12 }}>
        <div className="dashCardHead">
          <div>
            <div className="dashCardTitle">Admin</div>
            <div className="dashMuted">Manage users and module permissions.</div>
          </div>
          <div className="dashMiniPill">{roleLabel}</div>
        </div>
      </div>

      <AdminLayout
        title={page.id === "home" ? "Admin Dashboard" : page.id === "users:list" ? "Accounts" : "Permissions"}
        subtitle={
          page.id === "home"
            ? "Choose an area to manage."
            : page.id === "users:list"
            ? "Create, modify, and disable accounts."
            : "Control access rules (coming next)."
        }
        page={page}
        onGoHome={() => dispatch({ type: "NAV_HOME" })}
        actions={headerActions}
      >
        {renderAdminPage(page, perms, dispatch, usersRefreshTick)}
      </AdminLayout>
    </div>
  );
}