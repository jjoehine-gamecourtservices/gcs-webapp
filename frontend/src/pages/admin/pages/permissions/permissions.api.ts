import { apiJson } from "../../../../api/api";

export type PermissionCatalogItemDto = {
  key: string;
  label: string;
  parent: string | null;
};

export type PermissionCatalogResponseDto = {
  items: PermissionCatalogItemDto[];
};

export type UserPermissionsItemDto = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;
  name: string | null;
  permissions: string[];
};

export type UserPermissionsListResponseDto = {
  users: UserPermissionsItemDto[];
};

export type UpdateUserPermissionsRequestDto = {
  is_master: boolean;
  permissions: string[];
};

export type UpdateUserPermissionsResponseDto = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;
  name: string | null;
  permissions: string[];
};

export async function getPermissionCatalog() {
  return apiJson<PermissionCatalogResponseDto>("/api/user-permissions/catalog", {
    method: "GET",
  });
}

export async function getUsersWithPermissions() {
  return apiJson<UserPermissionsListResponseDto>("/api/user-permissions/users", {
    method: "GET",
  });
}

export async function updateUserPermissions(userId: number, payload: UpdateUserPermissionsRequestDto) {
  return apiJson<UpdateUserPermissionsResponseDto>(`/api/user-permissions/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}