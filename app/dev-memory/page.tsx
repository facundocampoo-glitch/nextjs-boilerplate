"use client";

import { useState } from "react";

export default function DevMemory() {
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

  const [kind, setKind] = useState("tema");
  const [content, setContent] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function call(action: "list" | "add") {
    setLoading(true);
    setError("");
    setOut("");

    try {
      const parsed = JSON.parse(body);

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "list"
            ? {
                action,
                user_profile: parsed.user_profile,
              }
            : {
                action,
                user_profile: parsed.user_profile,
                kind,
                content,
              }
        ),
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
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>
        DEV — Memoria evolutiva (v1)
      </h1>

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

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => call("list")}
          disabled={loading}
          style={{ padding: "8px 12px", marginRight: 8 }}
        >
          List memory
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          placeholder="kind (tema / preferencia / limite)"
          style={{ marginRight: 8 }}
        />
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="contenido"
          style={{ marginRight: 8 }}
        />
        <button
          onClick={() => call("add")}
          disabled={loading}
          style={{ padding: "8px 12px" }}
        >
          Add memory
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
    </main>
  );
}
