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
  const perms = new Set(user.permissions ?? []);
  const allowed: NavKey[] = [];

  if (perms.has("dashboard:view")) {
    allowed.push("dashboard");
  }

  if (perms.has("admin:access")) {
    allowed.push("admin");
  }

  if (perms.has("jobs:view") || perms.has("jobs")) {
    allowed.push("jobs");
  }

  if (
    perms.has("tasks:view") ||
    perms.has("tasks") ||
    perms.has("tasks.rentals") ||
    perms.has("tasks.stock")
  ) {
    allowed.push("tasks");
  }

  if (allowed.length === 0) {
    return ["dashboard"];
  }

  return allowed;
}

function isKeyAllowed(allowed: NavKey[], key: NavKey): boolean {
  return allowed.includes(key);
}

type JobsRoute =
  | { page: "all" }
  | { page: "overview"; jobId: string }
  | { page: "upcoming-planning" };

export default function AuthedShell({ user, onLogout }: Props) {
  const allowedKeys = useMemo(() => computeAllowedModules(user), [user]);

  const navItems = useMemo(() => {
    const allowed = new Set<NavKey>(allowedKeys);
    return ALL_MODULES.filter((m) => allowed.has(m.key));
  }, [allowedKeys]);

  const [active, setActive] = useState<NavKey>(() => allowedKeys[0] ?? "dashboard");
  const [jobsRoute, setJobsRoute] = useState<JobsRoute>({ page: "all" });
  const [moduleInstanceKey, setModuleInstanceKey] = useState(0);

  useEffect(() => {
    if (!isKeyAllowed(allowedKeys, active)) {
      setActive(allowedKeys[0] ?? "dashboard");
      setModuleInstanceKey((n) => n + 1);
    }
  }, [allowedKeys, active]);

  const openJobsAll = useCallback(() => {
    setJobsRoute({ page: "all" });
    setActive("jobs");
  }, []);

  const openJobOverview = useCallback((jobId: string) => {
    setJobsRoute({ page: "overview", jobId });
    setActive("jobs");
  }, []);

  const openUpcomingPlanning = useCallback(() => {
    setJobsRoute({ page: "upcoming-planning" });
    setActive("jobs");
  }, []);

  const openDashboard = useCallback(() => {
    setActive("dashboard");
  }, []);

  const onSelectModule = useCallback(
    (key: NavKey) => {
      if (key === active) {
        if (key === "jobs") {
          setJobsRoute({ page: "all" });
        }
        setModuleInstanceKey((n) => n + 1);
        return;
      }

      setActive(key);

      if (key === "jobs") {
        setJobsRoute({ page: "all" });
      }
    },
    [active]
  );

  const roleLabel = user.is_master ? "Master" : "User";

  const permsSet = useMemo(() => {
    const list = (user.permissions ?? []) as PermissionKey[];
    return new Set<PermissionKey>(list);
  }, [user.permissions]);

  const content = useMemo(() => {
    const fallback = (
      <DashboardPage user={user} onViewAllJobs={openUpcomingPlanning} onOpenJobOverview={openJobOverview} />
    );

    if (!isKeyAllowed(allowedKeys, active)) return fallback;

    switch (active) {
      case "dashboard":
        return fallback;

      case "admin":
        if (!user.is_master) return fallback;
        return <AdminPage userIsMaster={user.is_master} perms={permsSet} />;

      case "jobs":
        return (
          <JobsPage
            route={jobsRoute}
            onOpenAll={openDashboard}
            onOpenOverview={openJobOverview}
          />
        );

      case "tasks":
        return <TasksPage perms={permsSet} />;

      default:
        return fallback;
    }
  }, [active, allowedKeys, user, jobsRoute, openUpcomingPlanning, openJobOverview, openDashboard, permsSet]);

  return (
    <div className="dashRoot" aria-label="Dashboard Shell">
      <Header userEmail={user.email} roleLabel={roleLabel} onLogout={onLogout} />

      <div className="dashShell">
        <NavPanel items={navItems} activeKey={active} onSelect={onSelectModule} />

        <main className="dashContent" role="main" aria-label="Module Content" key={`${active}-${moduleInstanceKey}`}>
          {content}
        </main>
      </div>
    </div>
  );
}