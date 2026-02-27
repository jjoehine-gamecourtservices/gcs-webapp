// frontend/src/layout/AuthedShell.tsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import type { User } from "../types/user";
import Header from "./header/Header";
import NavPanel, { type NavItem, type NavKey } from "./NavPanel";

import DashboardPage from "../pages/dashboard/DashboardPage";
import AdminPage from "../pages/admin/AdminPage";
import JobsPage from "../pages/jobs/JobsPage";
import TasksPage from "../pages/tasks/TasksPage";
import type { PermissionKey } from "../pages/admin/permissions/permissions.types";

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
  if (user.is_master) return ["dashboard", "admin", "jobs", "tasks"];
  return ["dashboard"];
}

function isKeyAllowed(allowed: NavKey[], key: NavKey): boolean {
  return allowed.includes(key);
}

type JobsRoute = { page: "all" } | { page: "overview"; jobId: string };

export default function AuthedShell({ user, onLogout }: Props) {
  const allowedKeys = useMemo(() => computeAllowedModules(user), [user]);

  const navItems = useMemo(() => {
    const allowed = new Set<NavKey>(allowedKeys);
    return ALL_MODULES.filter((m) => allowed.has(m.key));
  }, [allowedKeys]);

  const [active, setActive] = useState<NavKey>(() => allowedKeys[0] ?? "dashboard");
  const [jobsRoute, setJobsRoute] = useState<JobsRoute>({ page: "all" });

  useEffect(() => {
    if (!isKeyAllowed(allowedKeys, active)) {
      setActive(allowedKeys[0] ?? "dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKeys.join("|"), active]);

  const openJobsAll = useCallback(() => {
    setJobsRoute({ page: "all" });
    setActive("jobs");
  }, []);

  const openJobOverview = useCallback((jobId: string) => {
    setJobsRoute({ page: "overview", jobId });
    setActive("jobs");
  }, []);

  const onSelectModule = useCallback((key: NavKey) => {
    setActive(key);
    if (key === "jobs") setJobsRoute({ page: "all" });
  }, []);

  const roleLabel = user.is_master ? "Master" : "User";

  const permsSet = useMemo(() => {
    const list = (user.permissions ?? []) as PermissionKey[];
    return new Set<PermissionKey>(list);
  }, [user.permissions]);

  const content = useMemo(() => {
    const fallback = (
      <DashboardPage user={user} onViewAllJobs={openJobsAll} onOpenJobOverview={openJobOverview} />
    );

    if (!isKeyAllowed(allowedKeys, active)) return fallback;

    switch (active) {
      case "dashboard":
        return fallback;

      case "admin":
        if (!user.is_master) return fallback;
        return <AdminPage userIsMaster={user.is_master} perms={permsSet} />;

      case "jobs":
        return <JobsPage route={jobsRoute} onOpenAll={openJobsAll} onOpenOverview={openJobOverview} />;

      case "tasks":
        return <TasksPage />;

      default:
        return fallback;
    }
  }, [active, allowedKeys, user, jobsRoute, openJobsAll, openJobOverview, permsSet]);

  return (
    <div className="dashRoot" aria-label="Dashboard Shell">
      <Header userEmail={user.email} roleLabel={roleLabel} onLogout={onLogout} />

      <div className="dashShell">
        <NavPanel items={navItems} activeKey={active} onSelect={onSelectModule} />

        <main className="dashContent" role="main" aria-label="Module Content" key={active}>
          {content}
        </main>
      </div>
    </div>
  );
}