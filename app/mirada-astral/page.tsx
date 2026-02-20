"use client";

import { useMemo, useState } from "react";

export default function MiradaAstralPage() {
  const [datos, setDatos] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioLoading, setAudioLoading] = useState(false);

  const [error, setError] = useState("");

  const prompt = useMemo(() => {
    return `MIRADA ASTRAL.\n\nDatos del usuario:\n${datos}\n\nEscribí una lectura breve (máx 1200 caracteres), filosa, cero incienso, con humor porteño y ternura contenida. Voseo. Terminá con una frase corta tipo golpe elegante.`;
  }, [datos]);

  async function generar() {
    setLoading(true);
    setError("");
    setText("");
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
        return;
      }

      setText(data.text);
    } catch (e: any) {
      setError(e?.message || "Error generando");
    } finally {
      setLoading(false);
    }
  }

  async function escuchar() {
    if (!text) return;

    setAudioLoading(true);
    setError("");
    setAudioUrl("");

    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
      setError(e?.message || "Error audio");
    } finally {
      setAudioLoading(false);
    }
  }

  return (
    <main style={{ padding: 18, fontFamily: "system-ui", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Mirada Astral</h1>

      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Pegá nombre/fecha/hora/lugar (o lo que tengas). Generás texto y después voz.
      </p>

      <textarea
        value={datos}
        onChange={(e) => setDatos(e.target.value)}
        rows={6}
        placeholder="Ej: Facundo, 04/10/1972, 19:00, Mendoza, Argentina"
        style={{ width: "100%", padding: 12, fontSize: 14, borderRadius: 12, border: "1px solid #ddd" }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={generar}
          disabled={loading || !datos.trim()}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {loading ? "Generando..." : "Generar"}
        </button>

        <button
          onClick={escuchar}
          disabled={!text || audioLoading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
            opacity: !text ? 0.5 : 1,
          }}
        >
          {audioLoading ? "Voz..." : "Escuchar"}
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

      {audioUrl && (
        <div style={{ marginTop: 14 }}>
          <audio controls autoPlay src={audioUrl} />
        </div>
      )}
    </main>
  );
}
