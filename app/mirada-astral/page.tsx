"use client";

import { useState } from "react";
import { callMiaApi } from "../../lib/miaApi";

export default function MiradaAstralPage() {

  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  async function handleGenerate() {

    const response = await callMiaApi({
      contentType: "mirada_astral",
      input: input,
      locale: "es-AR"
    });

    setResult(response.content);
  }

  return (
    <div style={{ padding: 40 }}>

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
        Generar
      </button>

      <br />
      <br />

      <div>
        {result}
      </div>

    </div>
  );
}