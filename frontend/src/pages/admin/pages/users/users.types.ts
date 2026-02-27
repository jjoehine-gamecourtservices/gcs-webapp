export type AdminUserRow = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;
  profile_key: string | null;

  // Persisted profile fields (stored in DB, shared across all clients)
  name: string | null;
  phone: string | null;
  position: string | null;
};

export type CreateUserRequest = {
  email: string;
  password: string;
  /**
   * Optional: only set when creating a Master account.
   * If backend doesn't support it, it will be ignored (or rejected).
   */
  is_master?: boolean;
};

export type ResetPasswordRequest = {
  password: string;
};

/**
 * Fields allowed to be patched from the Admin UI.
 *
 * IMPORTANT:
 * - Do NOT include is_master here (privilege changes must be a dedicated endpoint).
 * - is_active/profile_key are operational fields; backend will reject for master targets.
 */
export type PatchUserRequest = Partial<
  Pick<AdminUserRow, "email" | "name" | "phone" | "position" | "is_active" | "profile_key">
>;