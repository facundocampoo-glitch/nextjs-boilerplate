"use client";

import { useState } from "react";

export default function DevPage() {
  const [prompt, setPrompt] = useState(
    "Decime una frase corta, irónica y tierna, en voseo rioplatense."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioLoading, setAudioLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    setResult("");
    setAudioUrl("");

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

  async function speak() {
    if (!result) return;

    setAudioLoading(true);
    setError("");
    setAudioUrl("");

    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result }),
      });

      if (!r.ok) {
        const err = await r.text();
        setError(err);
        return;
      }

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e: any) {
      setError(e?.message || "Error TTS");
    } finally {
      setAudioLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>DEV — Test generate + tts</h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        style={{ width: "100%", maxWidth: 760, padding: 12, fontSize: 14 }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
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

        <button
          onClick={speak}
          disabled={!result || audioLoading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: !result || audioLoading ? "not-allowed" : "pointer",
            opacity: !result ? 0.5 : 1,
          }}
        >
          {audioLoading ? "Generando audio..." : "Escuchar"}
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

      {audioUrl && (
        <div style={{ marginTop: 16 }}>
          <audio controls autoPlay src={audioUrl} />
        </div>
      )}
    </main>
  );
}
