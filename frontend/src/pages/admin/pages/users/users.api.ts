import { apiJson } from "../../../../api/api";
import type { AdminUserRow, CreateUserRequest, PatchUserRequest, ResetPasswordRequest } from "./users.types";

export async function listUsers() {
  return apiJson<AdminUserRow[]>("/api/users", { method: "GET" });
}

export async function createUser(req: CreateUserRequest) {
  return apiJson<AdminUserRow>("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function patchUser(id: number, patch: PatchUserRequest) {
  return apiJson<AdminUserRow>(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function resetUserPassword(id: number, req: ResetPasswordRequest) {
  return apiJson<AdminUserRow>(`/api/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function deleteUser(id: number) {
  return apiJson<{ status: string }>(`/api/users/${id}`, { method: "DELETE" });
}