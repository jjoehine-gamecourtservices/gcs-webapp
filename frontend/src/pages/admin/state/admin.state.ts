import type { AdminAction, AdminNavState } from "../admin.types";

export function adminInitialState(): AdminNavState {
  return { id: "home" };
}

export function adminReducer(state: AdminNavState, action: AdminAction): AdminNavState {
  switch (action.type) {
    case "NAV_HOME":
      return { id: "home" };
    case "NAV_TO":
      return action.page;
    default:
      return state;
  }
}