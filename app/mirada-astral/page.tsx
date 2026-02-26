"use client";

import { useState } from "react";

export default function MiradaAstralPage() {
  const [datos, setDatos] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generar() {
    setLoading(true);
    setError("");
    setText("");

    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "horoscopo_diario",
          user_profile: {
            name: "Usuario",
            birth_date: "1972-10-04",
            birth_time: "19:00",
            birth_place: "Mendoza, Argentina",
            language: "es",
            delivery_time_pref: "ahora"
          },
          input_text: datos,
          question: ""
        }),
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

  return (
    <main style={{ padding: 18, maxWidth: 820, margin: "0 auto" }}>
      <h1>Mirada Astral</h1>

      <textarea
        value={datos}
        onChange={(e) => setDatos(e.target.value)}
        rows={6}
        placeholder="Escribí nombre / fecha / hora / lugar..."
        style={{ width: "100%", padding: 12 }}
      />

      <button onClick={generar} disabled={loading}>
        {loading ? "Generando..." : "Generar"}
      </button>

      {error && <pre style={{ color: "crimson" }}>{error}</pre>}
      {text && <pre>{text}</pre>}
    </main>
  );
}
