"use client";

import { useState, useEffect } from "react";

export default function DevDiario() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `horoscopo_diario_${todayKey}`;

  const [body, setBody] = useState(`{
  "content_type": "horoscopo_diario",
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
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setText(saved);
    }
  }, []);

  async function run() {
    setLoading(true);
    setError("");
    setText("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || `Error ${res.status}`);
        return;
      }

      setText(data.text);

      // 🔒 Guardar resultado del día
      localStorage.setItem(storageKey, data.text);

    } catch (e: any) {
      setError(e?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: "system-ui", maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>
        DEV — Horóscopo Diario (user_profile)
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
          minHeight: 220
        }}
      />

      <div style={{ marginTop: 12 }}>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer"
          }}
        >
          {loading ? "Generando..." : "Probar horóscopo diario"}
        </button>
      </div>

      {error && (
        <pre style={{ marginTop: 14, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      {text && (
        <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
          {text}
        </pre>
      )}
    </main>
  );
}
