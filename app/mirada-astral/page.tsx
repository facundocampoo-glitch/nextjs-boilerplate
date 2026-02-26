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
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#120404,#2a0a0a)",
      color: "#f5f5f5",
      padding: "40px 20px",
      fontFamily: "system-ui"
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        
        <h1 style={{
          fontSize: 28,
          letterSpacing: "0.15em",
          fontWeight: 600,
          marginBottom: 10
        }}>
          MIRADA ASTRAL
        </h1>

        <p style={{ opacity: 0.6, marginBottom: 30 }}>
          Nombre, fecha, hora y lugar de nacimiento.
        </p>

        <textarea
          value={datos}
          onChange={(e) => setDatos(e.target.value)}
          rows={5}
          placeholder="Ej: Facundo, 04/10/1972, 18:30, Mendoza, Argentina"
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#fff",
            fontSize: 15,
            outline: "none"
          }}
        />

        <button
          onClick={generar}
          disabled={loading || !datos.trim()}
          style={{
            marginTop: 20,
            padding: "14px 22px",
            borderRadius: 999,
            border: "none",
            background: loading ? "#555" : "#c92b2b",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          {loading ? "Generando..." : "Generar lectura"}
        </button>

        {error && (
          <div style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,0,0,0.1)",
            color: "#ff6b6b"
          }}>
            {error}
          </div>
        )}

        {text && (
          <div style={{
            marginTop: 30,
            padding: 20,
            borderRadius: 20,
            background: "rgba(255,255,255,0.05)",
            lineHeight: 1.6,
            fontSize: 15
          }}>
            {text}
          </div>
        )}

      </div>
    </main>
  );
}
