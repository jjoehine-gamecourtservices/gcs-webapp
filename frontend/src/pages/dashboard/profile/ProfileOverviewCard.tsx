import React, { useEffect, useMemo, useState } from "react";
import type { User } from "../../../types/user";
import { apiJson } from "../../../api/api";

type Props = {
  user: User; // initial session user (may be stale after admin edits)
};

export default function ProfileOverviewCard({ user }: Props) {
  const [me, setMe] = useState<User>(user);

  // Refresh "me" from the server so the card reflects DB-backed fields.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const r = await apiJson<User>("/api/auth/me", { method: "GET" });
      if (cancelled) return;
      if (r.ok && r.data) setMe(r.data);
      else setMe(user); // fall back to provided user
    };

    refresh();

    // Also refresh when tab regains focus (covers "edit in admin then go back to dashboard")
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const roleLabel = me.is_master ? "Master" : "User";

  const name = useMemo(() => (me.name ?? "").trim() || "Unknown", [me.name]);
  const phone = useMemo(() => (me.phone ?? "").trim() || "Unknown", [me.phone]);
  const position = useMemo(() => (me.position ?? "").trim() || "Unknown", [me.position]);

  return (
    <div className="dashCard">
      <div className="dashCardHead">
        <div>
          <div className="dashCardTitle">Profile Overview</div>
          <div className="dashMuted">Signed in and ready.</div>
        </div>
        <div className="dashMiniPill">{roleLabel}</div>
      </div>

      <div className="dashProfileIdentity">
        <div className="dashProfileName">{name}</div>
        <div className="dashProfileEmail" title={me.email}>
          {me.email}
        </div>
        <div className="dashProfileMeta">{phone}</div>
        <div className="dashProfileMeta">{position}</div>
      </div>
    </div>
  );
}