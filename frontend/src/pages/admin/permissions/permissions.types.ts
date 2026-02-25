export type PermissionKey =
  | "admin:access"
  | "users:read"
  | "permissions:read";

export type PermissionSet = ReadonlySet<PermissionKey>;