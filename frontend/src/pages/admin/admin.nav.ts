import type { AdminNavState } from "./admin.types";

export type AdminRequiredPermission = "users:read" | "permissions:read";

export type AdminTileDef = {
  id: string;
  title: string;
  description: string;
  to: AdminNavState;
  required?: AdminRequiredPermission;
  icon?: "users" | "lock";
};

export const ADMIN_TILES: AdminTileDef[] = [
  {
    id: "users",
    title: "Create / Modify Accounts",
    description: "Add users, disable accounts, and manage basic account details.",
    to: { id: "users:list" },
    required: "users:read",
    icon: "users",
  },
  {
    id: "permissions",
    title: "Permissions",
    description: "Control which modules and actions each role can access.",
    to: { id: "permissions" },
    required: "permissions:read",
    icon: "lock",
  },
];