"use client";

import { useState } from "react";

export default function DevPage() {
  const [prompt, setPrompt] = useState(
    "Decime una frase corta, irónica y tierna, en voseo rioplatense."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function run() {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await r.json();

      if (!r.ok || !data.ok) {
        setError(data?.error || `Error ${r.status}`);
      } else {
        setResult(data.text);
      }
    } catch (e: any) {
      setError(e?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>DEV — Test /api/generate</h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        style={{ width: "100%", maxWidth: 760, padding: 12, fontSize: 14 }}
      />

      <div style={{ marginTop: 12 }}>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generando..." : "Probar generate"}
        </button>
      </div>

      {error && (
        <pre style={{ marginTop: 16, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      {result && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          {result}
        </pre>
      )}
    </main>
  );
}
