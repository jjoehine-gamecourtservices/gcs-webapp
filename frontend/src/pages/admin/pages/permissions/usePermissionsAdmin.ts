import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPermissionCatalog,
  getUsersWithPermissions,
  updateUserPermissions,
  type PermissionCatalogItemDto,
  type UserPermissionsItemDto,
} from "./permissions.api";
import type { PermissionCatalogItem, PermissionKey, PermissionTreeSection, PermissionsUser } from "./permissions.types";

function isPermissionKey(value: string): value is PermissionKey {
  return value === "jobs" || value === "tasks" || value === "tasks.rentals" || value === "tasks.stock";
}

function mapCatalogItem(dto: PermissionCatalogItemDto): PermissionCatalogItem | null {
  if (!isPermissionKey(dto.key)) return null;
  if (dto.parent !== null && !isPermissionKey(dto.parent)) return null;

  return {
    key: dto.key,
    label: dto.label,
    parent: dto.parent,
  };
}

function mapUser(dto: UserPermissionsItemDto): PermissionsUser {
  return {
    id: dto.id,
    email: dto.email,
    is_master: dto.is_master,
    is_active: dto.is_active,
    name: dto.name,
    permissions: dto.permissions.filter((item: string): item is PermissionKey => isPermissionKey(item)),
  };
}

function buildSections(items: PermissionCatalogItem[]): PermissionTreeSection[] {
  const parents = items.filter((item: PermissionCatalogItem) => item.parent === null);
  const children = items.filter((item: PermissionCatalogItem) => item.parent !== null);

  return parents
    .map((parent) => ({
      key: parent.key,
      label: parent.label,
      children: children
        .filter((child) => child.parent === parent.key)
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default function usePermissionsAdmin() {
  const [users, setUsers] = useState<PermissionsUser[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [catalogRes, usersRes] = await Promise.all([getPermissionCatalog(), getUsersWithPermissions()]);

      if (!catalogRes.ok || !catalogRes.data) {
        setError(`Failed to load permission catalog: HTTP ${catalogRes.status}`);
        return;
      }

      if (!usersRes.ok || !usersRes.data) {
        setError(`Failed to load users: HTTP ${usersRes.status}`);
        return;
      }

      const nextCatalog = catalogRes.data.items
        .map(mapCatalogItem)
        .filter((item): item is PermissionCatalogItem => item !== null);

      const nextUsers = usersRes.data.users.map(mapUser);

      setCatalog(nextCatalog);
      setUsers(nextUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(() => buildSections(catalog), [catalog]);

  const saveUser = useCallback(
    async (userId: number, payload: { is_master: boolean; permissions: PermissionKey[] }) => {
      setSavingUserId(userId);
      setError("");

      try {
        const res = await updateUserPermissions(userId, payload);

        if (!res.ok || !res.data) {
          setError(`Failed to save permissions: HTTP ${res.status}`);
          return false;
        }

        const updated = mapUser(res.data);

        setUsers((current) => current.map((user) => (user.id === userId ? updated : user)));

        return true;
      } finally {
        setSavingUserId(null);
      }
    },
    []
  );

  return {
    users,
    sections,
    loading,
    savingUserId,
    error,
    reload: load,
    saveUser,
  };
}