// frontend/src/layout/AuthedShell.tsx

import React, { useEffect, useMemo, useState } from "react";
import type { User } from "../types/user";
import Header from "./header/Header";
import NavPanel, { type NavItem, type NavKey } from "./NavPanel";

import DashboardPage from "../pages/dashboard/DashboardPage";
import AdminPage from "../pages/admin/AdminPage";
import JobsPage from "../pages/jobs/JobsPage";
import TasksPage from "../pages/tasks/TasksPage";

type Props = {
  user: User;
  onLogout: () => void;
};

const ALL_MODULES: NavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "admin", label: "Admin" },
  { key: "jobs", label: "Jobs" },
  { key: "tasks", label: "Tasks" },
];

function computeAllowedModules(user: User): NavKey[] {
  // Contract:
  // - master always sees all modules
  // - default for regular users is dashboard only (until real permissions exist)
  if (user.is_master) return ["dashboard", "admin", "jobs", "tasks"];
  return ["dashboard"];
}

function isKeyAllowed(allowed: NavKey[], key: NavKey): boolean {
  return allowed.includes(key);
}

export default function AuthedShell({ user, onLogout }: Props) {
  const allowedKeys = useMemo(() => computeAllowedModules(user), [user]);

  const navItems = useMemo(() => {
    const allowed = new Set<NavKey>(allowedKeys);
    return ALL_MODULES.filter((m) => allowed.has(m.key));
  }, [allowedKeys]);

  const [active, setActive] = useState<NavKey>(() => allowedKeys[0] ?? "dashboard");

  // Ensure active module is always valid when user/permissions change
  useEffect(() => {
    if (!isKeyAllowed(allowedKeys, active)) {
      setActive(allowedKeys[0] ?? "dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKeys.join("|"), active]);

  const roleLabel = user.is_master ? "Master" : "User";

  const content = useMemo(() => {
    // Defense-in-depth: never render a module the user isn't allowed to access,
    // even if "active" is ever corrupted (future deep links, persistence, etc).
    if (!isKeyAllowed(allowedKeys, active)) {
      return <DashboardPage user={user} />;
    }

    switch (active) {
      case "dashboard":
        return <DashboardPage user={user} />;

      case "admin":
        // Explicit guard (even if computeAllowedModules changes later)
        if (!user.is_master) return <DashboardPage user={user} />;
        return <AdminPage user={user} />;

      case "jobs":
        return <JobsPage />;

      case "tasks":
        return <TasksPage />;

      default:
        return <DashboardPage user={user} />;
    }
  }, [active, allowedKeys, user]);

  return (
    <div className="dashRoot" aria-label="Dashboard Shell">
      <Header userEmail={user.email} roleLabel={roleLabel} onLogout={onLogout} />

      <div className="dashShell">
        <NavPanel items={navItems} activeKey={active} onSelect={setActive} />

        {/* The purple area */}
        <main className="dashContent" role="main" aria-label="Module Content" key={active}>
          {content}
        </main>
      </div>
    </div>
  );
}