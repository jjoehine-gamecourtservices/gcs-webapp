import React, { useEffect, useState } from "react";

export default function App() {
  const [text, setText] = useState<string>("Checking /api/health...");
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/health");
        const body = await res.text();
        if (cancelled) return;

        setOk(res.ok);
        setText(res.ok ? body : `HTTP ${res.status}: ${body}`);
      } catch (e: any) {
        if (cancelled) return;
        setOk(false);
        setText(e?.message ?? String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, Segoe UI, Arial", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>GCS Web Application</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Phase 3 baseline: real frontend build, routing preserved.
      </p>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Backend Health</h2>
        <p style={{ margin: "8px 0" }}>
          {ok === null ? "⏳" : ok ? "✅ OK" : "❌ Error"} — <code>/api/health</code>
        </p>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{text}</pre>
      </div>
    </div>
  );
}
