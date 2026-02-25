import React, { useCallback, useEffect, useMemo, useState } from "react";
import UsersTable from "./UsersTable";
import type { AdminUserRow } from "./users.types";
import { deleteUser, listUsers, patchUser, resetUserPassword } from "./users.api";

type Props = {
  refreshTick?: number;
};

export default function UsersListPage({ refreshTick = 0 }: Props) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const busyUserIds = useMemo(() => busyIds, [busyIds]);

  const markBusy = useCallback((id: number, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");

    const r = await listUsers();
    if (!r.ok || !r.data) {
      setRows([]);
      setMsg(`❌ Failed to load users: HTTP ${r.status}: ${r.text}`);
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
  }, [load, refreshTick]);

  const onToggleActive = useCallback(
    async (id: number, nextActive: boolean) => {
      setMsg("");
      markBusy(id, true);
      try {
        const r = await patchUser(id, { is_active: nextActive });
        if (!r.ok || !r.data) {
          setMsg(`❌ Update failed: HTTP ${r.status}: ${r.text}`);
          return;
        }
        setMsg(`✅ ${r.data.email} is now ${r.data.is_active ? "Active" : "Disabled"}.`);
        await load();
      } finally {
        markBusy(id, false);
      }
    },
    [load, markBusy]
  );

  const onResetPassword = useCallback(
    async (id: number, newPassword: string) => {
      setMsg("");
      const pwd = newPassword.trim();
      if (!pwd) {
        setMsg("❌ Password is required.");
        return;
      }

      markBusy(id, true);
      try {
        const r = await resetUserPassword(id, { password: pwd });
        if (!r.ok || !r.data) {
          setMsg(`❌ Reset password failed: HTTP ${r.status}: ${r.text}`);
          return;
        }
        setMsg(`✅ Password updated for ${r.data.email}.`);
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
          setMsg(`❌ Delete failed: HTTP ${r.status}: ${r.text}`);
          return;
        }
        setMsg("✅ User deleted.");
        await load();
      } finally {
        markBusy(id, false);
      }
    },
    [load, markBusy]
  );

  return (
    <div>
      {msg ? (
        <div className="dashCard" style={{ marginBottom: 12 }}>
          <div className="dashMuted">{msg}</div>
        </div>
      ) : null}

      <div className="dashCard">
        <div className="dashCardHead">
          <div>
            <div className="dashCardTitle">Users</div>
            <div className="dashMuted">Enable/disable accounts, set passwords, or delete users.</div>
          </div>
          <div className="dashMiniPill">{loading ? "Loading..." : `${rows.length} users`}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div className="dashMuted">Loading users…</div>
          ) : (
            <UsersTable
              rows={rows}
              busyUserIds={busyUserIds}
              onToggleActive={onToggleActive}
              onResetPassword={onResetPassword}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}