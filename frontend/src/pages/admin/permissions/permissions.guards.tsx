import React from "react";
import type { PermissionKey, PermissionSet } from "./permissions.types";

export function hasPerm(perms: PermissionSet, perm: PermissionKey): boolean {
  return perms.has(perm);
}

type CanProps = {
  perms: PermissionSet;
  perm: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function Can({ perms, perm, children, fallback = null }: CanProps) {
  return hasPerm(perms, perm) ? <>{children}</> : <>{fallback}</>;
}