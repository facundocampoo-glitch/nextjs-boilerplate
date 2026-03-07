"use client";

import { useState } from "react";
import { callMiaApi } from "@/lib/miaApi";

export default function SuenosPage() {
  const [input, setInput] = useState("");
  const [reading, setReading] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    const trimmed = input.trim();

    if (!trimmed) {
      setError("Escribe tu sueño antes de generar la lectura.");
      return;
    }

    setLoading(true);
    setAudioLoading(false);
    setError("");
    setReading("");
    setAudioSrc("");

    try {
      const response = await callMiaApi({
        contentType: "cuerpo_onirico",
        input: trimmed,
        locale: "es-AR",
      });

      const content = response.content || "";
      setReading(content);

      if (!content) return;

      setAudioLoading(true);

      const ttsRes = await fetch("/api/generate-tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: content,
          locale: "es-AR",
        }),
      });

      const ttsData = await ttsRes.json();

      if (!ttsRes.ok) {
        console.error("TTS error:", ttsData);
        setError(ttsData?.error || "Error generando audio");
        return;
      }

      if (!ttsData?.audioBase64) {
        setError("El audio no llegó desde el servidor");
        return;
      }

      setAudioSrc(`data:audio/mpeg;base64,${ttsData.audioBase64}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error generando lectura.";

      setError(message);
    } finally {
      setLoading(false);
      setAudioLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Sueños</h1>
        </header>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe tu sueño..."
          className="w-full min-h-[180px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        />

        <button
          onClick={handleGenerate}
          disabled={loading || audioLoading}
          className="mt-4 rounded-2xl bg-white px-5 py-3 text-black"
        >
          {loading
            ? "Generando lectura..."
            : audioLoading
            ? "Generando audio..."
            : "Generar lectura"}
        </button>

        {error && (
          <div className="mt-6 text-red-400">
            {error}
          </div>
        )}

        {audioSrc && (
          <div className="mt-8">
            <audio controls src={audioSrc} className="w-full" />
          </div>
        )}

        {reading && (
          <div className="mt-8 whitespace-pre-wrap">
            {reading}
          </div>
        )}
      </div>
    </main>
  );
}