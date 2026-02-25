export type AdminUserRow = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;
  profile_key: string | null;
};

export type CreateUserRequest = {
  email: string;
  password: string;
};

export type ResetPasswordRequest = {
  password: string;
};

export type PatchUserRequest = Partial<Pick<AdminUserRow, "email" | "is_active" | "is_master" | "profile_key">>;