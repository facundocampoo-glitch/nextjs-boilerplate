"use client";

import { useEffect, useState } from "react";

export default function DevCupos() {
  const [body, setBody] = useState(`{
  "user_profile": {
    "name": "Facundo",
    "birth_date": "1972-10-04",
    "birth_time": "19:00",
    "birth_place": "Mendoza, Argentina",
    "language": "es",
    "delivery_time_pref": "08:00"
  }
}`);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");
  const [error, setError] = useState("");

  async function call(action: "check" | "consume", module: "suenos" | "psicomagia") {
    setLoading(true);
    setError("");
    setOut("");

    try {
      const parsed = JSON.parse(body);
      const res = await fetch("/api/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          module,
          user_profile: parsed.user_profile,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || `Error ${res.status}`);
        return;
      }

      setOut(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: "system-ui", maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>DEV — Cupos mensuales (Sueños / Psicomagia)</h1>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 13,
          borderRadius: 12,
          border: "1px solid #ddd",
          minHeight: 220,
        }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => call("check", "suenos")}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {loading ? "..." : "Check Sueños"}
        </button>

        <button
          onClick={() => call("consume", "suenos")}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {loading ? "..." : "Consume Sueños"}
        </button>

        <button
          onClick={() => call("check", "psicomagia")}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {loading ? "..." : "Check Psicomagia"}
        </button>

        <button
          onClick={() => call("consume", "psicomagia")}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {loading ? "..." : "Consume Psicomagia"}
        </button>
      </div>

      {error && (
        <pre style={{ marginTop: 14, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      {out && (
        <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
          {out}
        </pre>
      )}

      <p style={{ marginTop: 14, color: "#666", fontSize: 13 }}>
        Tip: probá “Consume” 5 veces y vas a ver que a la 5ta te bloquea (límite 4).
      </p>
    </main>
  );
}
