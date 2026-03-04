import React, { useCallback, useEffect, useMemo, useState } from "react";

/* Direct CSS imports (order matters) */
import "./styles/base.css";
import "./styles/login.css";
import "./styles/shell.css";
import "./styles/header.css";
import "./styles/dashboard.css";
import "./styles/jobs.css";

import { apiJson, apiText } from "./api/api";
import LoginPage from "./auth/LoginPage";
import AuthedShell from "./layout/AuthedShell";
import type { User } from "./types/user";

export default function App() {
  const buildStamp = useMemo(() => new Date().toISOString(), []);

  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const fetchMe = useCallback(async () => {
    const r = await apiJson<User>("/api/auth/me", { method: "GET" });
    if (r.ok && r.data) return r.data;
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  const onLoggedIn = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, [fetchMe]);

  const onLogout = useCallback(async () => {
    await apiText("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // IMPORTANT: LoginPage must remain unchanged and must not be wrapped in the app shell.
  if (!user) {
    return <LoginPage buildStamp={buildStamp} onLoggedIn={onLoggedIn} />;
  }

  return (
    <div className="gcsBg">
      <div className="gcsGlow" aria-hidden="true" />
      <div className="gcsGrid" aria-hidden="true" />

      <div className="gcsAuthedPage" aria-label="Authenticated App Shell">
        <div className="gcsAuthedTop">
          <div className="gcsAuthedBuild">BUILD CHECK: {buildStamp}</div>
        </div>

        <main className="gcsAuthedMain" role="main">
          <AuthedShell user={user} onLogout={onLogout} />
        </main>
      </div>
    </div>
  );
}