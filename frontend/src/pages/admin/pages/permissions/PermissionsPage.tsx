import React, { useCallback, useEffect, useMemo, useState } from "react";
import usePermissionsAdmin from "./usePermissionsAdmin";
import type { PermissionKey, PermissionTreeSection, PermissionsUser } from "./permissions.types";

type PermissionRoleFilter = "all" | "admin" | "user";

type Props = {
  search: string;
  roleFilter: PermissionRoleFilter;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
};

function displayUserName(user: PermissionsUser): string {
  const name = (user.name ?? "").trim();
  if (name) return name;
  return user.email;
}

function sortUsers(users: PermissionsUser[]): PermissionsUser[] {
  return [...users].sort((a, b) => {
    const aName = displayUserName(a).toLowerCase();
    const bName = displayUserName(b).toLowerCase();
    return aName.localeCompare(bName);
  });
}

function getChildKeys(section: PermissionTreeSection): PermissionKey[] {
  return section.children.map((child) => child.key);
}

function isParentChecked(section: PermissionTreeSection, selected: Set<PermissionKey>): boolean {
  const childKeys = getChildKeys(section);
  if (childKeys.length === 0) {
    return selected.has(section.key);
  }
  return childKeys.every((key) => selected.has(key));
}

function nextSelectedForParent(
  section: PermissionTreeSection,
  current: Set<PermissionKey>,
  checked: boolean
): Set<PermissionKey> {
  const next = new Set(current);
  const childKeys = getChildKeys(section);

  if (childKeys.length === 0) {
    if (checked) next.add(section.key);
    else next.delete(section.key);
    return next;
  }

  if (checked) {
    childKeys.forEach((key) => next.add(key));
  } else {
    childKeys.forEach((key) => next.delete(key));
    next.delete(section.key);
  }

  return next;
}

function nextSelectedForChild(
  section: PermissionTreeSection,
  key: PermissionKey,
  current: Set<PermissionKey>,
  checked: boolean
): Set<PermissionKey> {
  const next = new Set(current);

  if (checked) next.add(key);
  else next.delete(key);

  const childKeys = getChildKeys(section);
  const allChildrenChecked = childKeys.length > 0 && childKeys.every((childKey) => next.has(childKey));

  if (allChildrenChecked) next.add(section.key);
  else next.delete(section.key);

  return next;
}

function normalizedDirectPermissions(
  sections: PermissionTreeSection[],
  selected: Set<PermissionKey>
): PermissionKey[] {
  const out = new Set<PermissionKey>();

  sections.forEach((section) => {
    const childKeys = getChildKeys(section);

    if (childKeys.length === 0) {
      if (selected.has(section.key)) out.add(section.key);
      return;
    }

    childKeys.forEach((key) => {
      if (selected.has(key)) out.add(key);
    });
  });

  return Array.from(out).sort();
}

export default function PermissionsPage({ search, roleFilter, filtersOpen, onFiltersOpenChange }: Props) {
  const { users, sections, loading, savingUserId, error, saveUser } = usePermissionsAdmin();

  const sortedUsers = useMemo(() => sortUsers(users), [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedUsers.filter((user) => {
      const name = displayUserName(user).toLowerCase();
      const email = (user.email ?? "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && user.is_master) ||
        (roleFilter === "user" && !user.is_master);

      return matchesSearch && matchesRole;
    });
  }, [sortedUsers, search, roleFilter]);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const selectedUser = useMemo(
    () => sortedUsers.find((user) => user.id === selectedUserId) ?? null,
    [sortedUsers, selectedUserId]
  );

  const [isMaster, setIsMaster] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<PermissionKey>>(new Set());
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!selectedUser) {
      setIsMaster(false);
      setSelectedPermissions(new Set());
      setSaveMessage("");
      return;
    }

    setIsMaster(selectedUser.is_master);

    const initial = new Set<PermissionKey>(selectedUser.permissions);
    sections.forEach((section) => {
      const childKeys = getChildKeys(section);
      if (childKeys.length > 0 && childKeys.every((key) => initial.has(key))) {
        initial.add(section.key);
      }
    });

    setSelectedPermissions(initial);
    setSaveMessage("");
  }, [selectedUser, sections]);

  useEffect(() => {
    onFiltersOpenChange(false);
  }, [search, roleFilter, onFiltersOpenChange]);

  const closeModal = useCallback(() => {
    setSelectedUserId(null);
    setSaveMessage("");
  }, []);

  const onToggleAdmin = useCallback(
    (checked: boolean) => {
      setIsMaster(checked);

      if (checked) {
        const allKeys = new Set<PermissionKey>();
        sections.forEach((section) => {
          allKeys.add(section.key);
          section.children.forEach((child) => allKeys.add(child.key));
        });
        setSelectedPermissions(allKeys);
      }
    },
    [sections]
  );

  const onToggleParent = useCallback((section: PermissionTreeSection, checked: boolean) => {
    setSelectedPermissions((current) => nextSelectedForParent(section, current, checked));
  }, []);

  const onToggleChild = useCallback((section: PermissionTreeSection, key: PermissionKey, checked: boolean) => {
    setSelectedPermissions((current) => nextSelectedForChild(section, key, current, checked));
  }, []);

  const onSave = useCallback(async () => {
    if (!selectedUser) return;

    setSaveMessage("");

    const directPermissions = isMaster ? [] : normalizedDirectPermissions(sections, selectedPermissions);

    const ok = await saveUser(selectedUser.id, {
      is_master: isMaster,
      permissions: directPermissions,
    });

    if (!ok) {
      setSaveMessage("✖ Failed to save permissions.");
      return;
    }

    setSaveMessage("✓ Permissions saved.");
  }, [isMaster, saveUser, sections, selectedPermissions, selectedUser]);

  return (
    <div className="permissionsPage">
      {error ? <div className="dashMuted permissionsBoardMessage">{error}</div> : null}

      {loading ? (
        <div className="dashMuted permissionsBoardMessage">Loading permissions...</div>
      ) : (
        <div className="permissionsListScroll jobsPanelScroll">
          <div className="permissionsListInner">
            {filteredUsers.length === 0 ? (
              <div className="dashMuted permissionsBoardMessage">No users found.</div>
            ) : (
              <div className="permissionsUserList">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="dashMiniPill permissionsUserButton"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <span className="permissionsUserText">
                      <span>{displayUserName(user)}</span>
                      <span className="dashMuted permissionsUserEmail">{user.email}</span>
                    </span>

                    <span className="dashMuted permissionsUserRole">{user.is_master ? "Admin" : "User"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedUser ? (
        <div
          role="dialog"
          aria-modal="true"
          className="permissionsModalOverlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="dashCard permissionsModalCard">
            <div className="dashCardHead">
              <div>
                <div className="dashCardTitle">{displayUserName(selectedUser)}</div>
                <div className="dashMuted">{selectedUser.email}</div>
              </div>

              <button type="button" className="dashMiniPill permissionsClickable" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="permissionsModalContent">
              <div className="permissionsAdminRow">
                <div>
                  <div className="permissionsAdminTitle">Admin</div>
                  <div className="dashMuted permissionsAdminSubtitle">
                    Admin accounts have full unrestricted access to all modules.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isMaster}
                  onChange={(e) => onToggleAdmin(e.target.checked)}
                  className="permissionsCheckbox"
                />
              </div>

              <div className="permissionsSections">
                {sections.map((section) => {
                  const parentChecked = isMaster || isParentChecked(section, selectedPermissions);

                  return (
                    <div key={section.key} className="permissionsSectionCard">
                      <label className={`permissionsSectionHeader ${isMaster ? "permissionsDisabled" : ""}`}>
                        <span>{section.label}</span>
                        <input
                          type="checkbox"
                          checked={parentChecked}
                          disabled={isMaster}
                          onChange={(e) => onToggleParent(section, e.target.checked)}
                          className="permissionsCheckbox"
                        />
                      </label>

                      {section.children.length > 0 ? (
                        <div className="permissionsChildren">
                          {section.children.map((child) => (
                            <label
                              key={child.key}
                              className={`permissionsChildRow ${isMaster ? "permissionsDisabled" : ""}`}
                            >
                              <span>{child.label}</span>
                              <input
                                type="checkbox"
                                checked={isMaster || selectedPermissions.has(child.key)}
                                disabled={isMaster}
                                onChange={(e) => onToggleChild(section, child.key, e.target.checked)}
                                className="permissionsCheckbox"
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {saveMessage ? <div className="dashMuted">{saveMessage}</div> : null}

              <div className="permissionsActions">
                <button type="button" className="dashMiniPill permissionsClickable" onClick={closeModal}>
                  Cancel
                </button>

                <button
                  type="button"
                  className="dashMiniPill permissionsClickable"
                  onClick={onSave}
                  disabled={savingUserId === selectedUser.id}
                >
                  {savingUserId === selectedUser.id ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}