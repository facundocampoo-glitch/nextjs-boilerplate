"use client";

import { useState } from "react";
import { callMiaApi } from "../../lib/miaApi";

function formatText(text: string) {
  if (!text) return [];

  // Si ya trae párrafos, los respeta
  if (text.includes("\n")) {
    return text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // Si viene “chorizo”, lo corta por oraciones
  return text
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function MiradaAstralPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleGenerate() {
    setStatus("loading");
    setResult("Generando...");

    try {
      const response = await callMiaApi({
        contentType: "cuerpo_astral",
        input: input,
        locale: "es-AR",
      });

      setResult(response.content || "(sin contenido)");
      setStatus("done");
    } catch (e: any) {
      setResult("ERROR: " + (e?.message || "error desconocido"));
      setStatus("error");
    }
  }

  const paragraphs = formatText(result);

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>Mirada Astral</h1>

      <textarea
        placeholder="Escribí tu consulta..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: "100%", height: 120 }}
      />

      <br />
      <br />

      <button onClick={handleGenerate}>
        {status === "loading" ? "Generando..." : "Generar"}
      </button>

      <br />
      <br />

      <div>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginBottom: 16, lineHeight: 1.6 }}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}