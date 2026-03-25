import React, { useMemo, useState } from "react";
import type { AdminNavState } from "./admin.types";

import AdminHomePage from "./pages/home/AdminHomePage";
import PermissionsPage from "./pages/permissions/PermissionsPage";
import UsersListPage from "./pages/users/UsersListPage";

type Props = {
  userIsMaster: boolean;
  perms?: Set<string>;
};

type PermissionRoleFilter = "all" | "admin" | "user";

export default function AdminPage({ userIsMaster, perms }: Props) {
  const [page, setPage] = useState<AdminNavState>({ id: "home" });

  const [permissionsSearch, setPermissionsSearch] = useState("");
  const [permissionsRoleFilter, setPermissionsRoleFilter] = useState<PermissionRoleFilter>("all");
  const [permissionsFiltersOpen, setPermissionsFiltersOpen] = useState(false);

  const effectivePerms = useMemo(() => {
    return perms ?? new Set<string>();
  }, [perms]);

  const title = useMemo(() => {
    if (page.id === "users:list") return "Accounts";
    if (page.id === "permissions") return "Permissions";
    return "Admin";
  }, [page.id]);

  const actions = useMemo(() => {
    if (page.id !== "permissions") return null;

    const hasActiveFilters = permissionsRoleFilter !== "all";

    return (
      <div className="dashFilters">
        <input
          className="dashInput"
          placeholder="Search user"
          type="text"
          value={permissionsSearch}
          onChange={(e) => setPermissionsSearch(e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <button
            className="dashMiniPill jobsActionButton jobsFilterButton"
            type="button"
            onClick={() => setPermissionsFiltersOpen((v) => !v)}
            aria-label="Filters"
            style={{
              position: "relative",
              paddingRight: hasActiveFilters ? 28 : undefined,
            }}
          >
            <span>Filters</span>
            {hasActiveFilters ? <span aria-hidden="true" className="jobsFilterActiveDot" /> : null}
          </button>

          {permissionsFiltersOpen ? (
            <div className="jobsFilterPopover">
              <div className="jobsFilterPopoverTitle">Role Filter</div>

              <div className="jobsFilterOptions">
                <label className="jobsFilterOption">
                  <input
                    type="checkbox"
                    checked={permissionsRoleFilter === "all"}
                    onChange={() => setPermissionsRoleFilter("all")}
                  />
                  <span>All</span>
                </label>

                <label className="jobsFilterOption">
                  <input
                    type="checkbox"
                    checked={permissionsRoleFilter === "admin"}
                    onChange={() => setPermissionsRoleFilter("admin")}
                  />
                  <span>Admin</span>
                </label>

                <label className="jobsFilterOption">
                  <input
                    type="checkbox"
                    checked={permissionsRoleFilter === "user"}
                    onChange={() => setPermissionsRoleFilter("user")}
                  />
                  <span>User</span>
                </label>
              </div>

              <div className="jobsFilterFooter">
                <div className="jobsFilterFooterText">
                  {permissionsRoleFilter === "all" ? "No filters active" : "1 active"}
                </div>

                <button
                  className="dashBtn"
                  type="button"
                  onClick={() => setPermissionsRoleFilter("all")}
                  disabled={!hasActiveFilters}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }, [page.id, permissionsFiltersOpen, permissionsRoleFilter, permissionsSearch]);

  const showHeader = page.id !== "home";

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {showHeader ? (
        <div style={{ flex: "0 0 auto" }}>
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div className="dashCardTitle" style={{ whiteSpace: "nowrap" }}>
                {title}
              </div>
            </div>

            {actions ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{actions}</div> : null}
          </div>
        </div>
      ) : null}

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          marginTop: showHeader ? 12 : 0,
        }}
      >
        {page.id === "home" ? <AdminHomePage perms={effectivePerms} onNavigate={(to) => setPage(to)} /> : null}

        {page.id === "users:list" ? <UsersListPage userIsMaster={userIsMaster} /> : null}

        {page.id === "permissions" ? (
          <PermissionsPage
            search={permissionsSearch}
            roleFilter={permissionsRoleFilter}
            filtersOpen={permissionsFiltersOpen}
            onFiltersOpenChange={setPermissionsFiltersOpen}
          />
        ) : null}
      </div>
    </section>
  );
}