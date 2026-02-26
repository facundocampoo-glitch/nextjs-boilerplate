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
          content_type: "mirada_astral",
          user_profile: {
            name: "Usuario",
            birth_date: "1972-10-04",
            birth_time: "18:30",
            birth_place: "Mendoza, Argentina",
            language: "es",
            delivery_time_pref: "ahora",
          },
          input_text: datos,
          question: "",
        }),
      });

      const data = await r.json();
      if (!r.ok || !data?.ok) {
        setError(data?.error || `Error ${r.status}`);
        return;
      }

      setText(data.text || "");
    } catch (e: any) {
      setError(e?.message || "Error generando");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0e",
        color: "#e6e6e6",
        padding: "60px 24px",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 26,
            letterSpacing: "0.18em",
            fontWeight: 600,
            marginBottom: 12,
            color: "#f0f0f0",
          }}
        >
          MIRADA ASTRAL
        </h1>

        <p style={{ opacity: 0.45, marginBottom: 36 }}>
          Nombre, fecha, hora y lugar de nacimiento.
        </p>

        <textarea
          value={datos}
          onChange={(e) => setDatos(e.target.value)}
          rows={5}
          placeholder="Ej: Facundo, 04/10/1972, 18:30, Mendoza, Argentina"
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 18,
            border: "1px solid #1f1f23",
            background: "#141418",
            color: "#e6e6e6",
            fontSize: 15,
            outline: "none",
          }}
        />

        <button
          onClick={generar}
          disabled={loading || !datos.trim()}
          style={{
            marginTop: 24,
            padding: "14px 24px",
            borderRadius: 999,
            border: "1px solid #2a2a30",
            background: "#1c1c22",
            color: "#f0f0f0",
            cursor: "pointer",
            fontWeight: 500,
            transition: "0.2s ease",
          }}
        >
          {loading ? "Generando..." : "Generar lectura"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 16,
              background: "#1a1012",
              border: "1px solid #3a1d22",
              color: "#ff7b7b",
            }}
          >
            {error}
          </div>
        )}

        {text && (
          <div
            style={{
              marginTop: 36,
              padding: 28,
              borderRadius: 24,
              background: "#121217",
              border: "1px solid #1e1e24",
              lineHeight: 1.7,
              fontSize: 15,
              color: "#dcdcdc",
            }}
          >
            {text}
          </div>
        )}
      </div>
    </main>
  );
}
