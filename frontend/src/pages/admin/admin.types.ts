export type AdminPageId = "home" | "users:list" | "permissions";

export type AdminNavState =
  | { id: "home" }
  | { id: "users:list" }
  | { id: "permissions" };

export type AdminAction =
  | { type: "NAV_TO"; page: AdminNavState }
  | { type: "NAV_HOME" };