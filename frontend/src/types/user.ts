// frontend/src/types/user.ts

export type User = {
  id: number;
  email: string;
  is_master: boolean;
  is_active: boolean;

  // Optional: backend may include permissions for UI gating
  permissions?: string[];

  // Persisted profile fields (stored in DB, shared across all clients)
  name?: string | null;
  phone?: string | null;
  position?: string | null;
};