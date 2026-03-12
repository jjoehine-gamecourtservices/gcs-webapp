import React from "react";
import TileGrid from "../../../../components/tiles/TileGrid";
import type { PermissionSet } from "../../permissions/permissions.types";
import { ADMIN_TILES } from "../../admin.nav";
import { hasPerm } from "../../permissions/permissions.guards";

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11ZM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.96 1.97 3.45V20h7v-3.5C24 14.17 18.33 13 16 13Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 17a2 2 0 0 0 2-2v-1a2 2 0 1 0-4 0v1a2 2 0 0 0 2 2Zm6-7h-1V8a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2ZM9 8a3 3 0 0 1 6 0v2H9V8Z"
        fill="currentColor"
      />
    </svg>
  );
}

type Props = {
  perms: PermissionSet;
  onNavigate: (to: { id: "users:list" } | { id: "permissions" }) => void;
};

export default function AdminHomePage({ perms, onNavigate }: Props) {
  const tiles = ADMIN_TILES.map((t) => {
    const disabled = t.required ? !hasPerm(perms, t.required) : false;
    const icon = t.icon === "users" ? <UsersIcon /> : t.icon === "lock" ? <LockIcon /> : null;

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      icon,
      disabled,
      onClick: () => onNavigate(t.to as { id: "users:list" } | { id: "permissions" }),
    };
  });

  return <TileGrid tiles={tiles} />;
}