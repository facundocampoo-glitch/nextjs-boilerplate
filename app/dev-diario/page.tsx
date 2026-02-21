"use client";

import { useEffect, useMemo, useState } from "react";

export default function DevDiario() {
  const todayKey = new Date().toISOString().slice(0, 10);

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
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState("");
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  // DEV toggles
  const [forceServer, setForceServer] = useState(false);

  const storageKey = useMemo(() => {
    // guardamos por día + por nombre (para no trabar pruebas)
    try {
      const parsed = JSON.parse(body);
      const name = String(parsed?.user_profile?.name || "anon")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      return `horoscopo_diario_${todayKey}_${name}`;
    } catch {
      return `horoscopo_diario_${todayKey}_anon`;
    }
  }, [body, todayKey]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setText(saved);
      setAlreadyGenerated(true);
    } else {
      setText("");
      setAlreadyGenerated(false);
    }
    // reset meta cuando cambia el user
    setMeta(null);
    setError("");
  }, [storageKey]);

  function resetToday() {
    localStorage.removeItem(storageKey);
    setText("");
    setMeta(null);
    setError("");
    setAlreadyGenerated(false);
  }

  async function run() {
    // si ya existe y NO estás forzando, no hacemos nada
    if (alreadyGenerated && !forceServer) return;

    setLoading(true);
    setError("");
    setMeta(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...JSON.parse(body),
          force_regenerate: forceServer, // 👈 nuevo
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || `Error ${res.status}`);
        return;
      }

      setText(data.text || "");
      setMeta({
        cached: data.cached,
        memory_used: data.memory_used,
      });

      // guardamos local para no re-spamear desde el navegador
      localStorage.setItem(storageKey, data.text || "");
      setAlreadyGenerated(true);
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
          minHeight: 220,
        }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={run}
          disabled={loading || (alreadyGenerated && !forceServer)}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Generando..." : alreadyGenerated && !forceServer ? "Ya generado hoy" : "Generar"}
        </button>

        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={forceServer}
            onChange={(e) => setForceServer(e.target.checked)}
          />
          Forzar regeneración (server)
        </label>

        <button
          onClick={resetToday}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Reset hoy (DEV)
        </button>
      </div>

      {meta && (
        <pre style={{ marginTop: 10, background: "#f7f7f7", padding: 10, borderRadius: 12, fontSize: 12 }}>
{JSON.stringify(meta, null, 2)}
        </pre>
      )}

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
