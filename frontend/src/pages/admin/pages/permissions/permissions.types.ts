export type PermissionKey = "jobs" | "tasks" | "tasks.rentals" | "tasks.stock";

export type PermissionCatalogItem = {
  key: PermissionKey;
  label: string;
  parent: PermissionKey | null;
};

export type PermissionsUser = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;
  name: string | null;
  permissions: PermissionKey[];
};

export type PermissionTreeSection = {
  key: PermissionKey;
  label: string;
  children: PermissionCatalogItem[];
};