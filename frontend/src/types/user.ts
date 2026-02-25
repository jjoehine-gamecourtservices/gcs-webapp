// frontend/src/types/user.ts

export type User = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;
  permissions?: string[];
};