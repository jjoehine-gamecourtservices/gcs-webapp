import React, { useCallback, useMemo, useState } from "react";
import { apiJson, apiText } from "../api/api";

type Props = {
  buildStamp: string;
  onLoggedIn: () => void;
};

export default function LoginPage({ buildStamp, onLoggedIn }: Props) {
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [loginMsg, setLoginMsg] = useState<string>("");

  // Health state
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [healthText, setHealthText] = useState<string>("Not checked yet");

  const canSubmit = useMemo(() => {
    return !busy && email.trim().length > 0 && password.trim().length > 0;
  }, [busy, email, password]);

  const fetchHealth = useCallback(async () => {
    setHealthOk(null);
    setHealthText("Checking /api/health ...");

    try {
      const r = await apiText("/api/health", { method: "GET" });
      setHealthOk(r.ok);
      setHealthText(r.ok ? r.text : `HTTP ${r.status}: ${r.text}`);
    } catch (e: any) {
      setHealthOk(false);
      setHealthText(e?.message ?? String(e));
    }
  }, []);

  const onSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      setBusy(true);
      setLoginMsg("POST /api/auth/login ...");

      try {
        const r = await apiJson<{ status?: string }>("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!r.ok) {
          setLoginMsg(`❌ Login failed: HTTP ${r.status}: ${r.text}`);
          return;
        }

        setLoginMsg("✅ Login OK (cookie set). Checking /api/health ...");
        await fetchHealth();

        // IMPORTANT: switch to dashboard (App owns session validation if you want)
        onLoggedIn();
      } catch (err: any) {
        setLoginMsg(`❌ ${err?.message ?? String(err)}`);
      } finally {
        setBusy(false);
      }
    },
    [email, password, fetchHealth, onLoggedIn]
  );

  // Small helpers for consistent input styling without forcing you to redo CSS yet.
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "var(--text)",
    outline: "none",
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 700,
    marginBottom: 6,
    fontSize: 13,
    color: "var(--muted)",
  };

  return (
    <div className="gcsBg">
      <div className="gcsGlow" aria-hidden="true" />
      <div className="gcsGrid" aria-hidden="true" />

      <div className="gcsPage">
        <div className="gcsShell">
          <div className="gcsBuild">BUILD CHECK: {buildStamp}</div>

          <main className="gcsCard" role="main" aria-label="Login">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.2 }}>GCS Web Application</h1>
              <span className="pill">Login</span>
            </div>

            <p className="sub">
              Login uses cookie auth via Caddy HTTPS and relative <code>/api/...</code> paths.
            </p>

            <form onSubmit={onSubmit} autoComplete="on" noValidate>
              <label style={labelStyle} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="username"
                placeholder="you@gcs.local"
                style={inputStyle}
              />

              <div style={{ height: 12 }} />

              <label style={labelStyle} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: canSubmit ? "rgba(120, 160, 255, 0.26)" : "rgba(255,255,255,0.10)",
                    color: canSubmit ? "white" : "rgba(255,255,255,0.65)",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    fontWeight: 800,
                  }}
                >
                  {busy ? "Logging in..." : "Login"}
                </button>

                <button
                  type="button"
                  onClick={fetchHealth}
                  disabled={busy}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.85)",
                    cursor: busy ? "not-allowed" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  Check Health
                </button>

                <span style={{ opacity: 0.95, color: "var(--text)", fontSize: 13 }}>{loginMsg}</span>
              </div>
            </form>

            <section
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }}
              aria-label="Backend Health"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 900 }}>Backend Health</div>
                <div style={{ opacity: 0.85 }}>
                  {healthOk === null ? "⏳" : healthOk ? "✅ OK" : "❌ Error"} — <code>/api/health</code>
                </div>
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  padding: 12,
                  borderRadius: 10,
                  overflowX: "auto",
                }}
              >
                {healthText}
              </pre>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}