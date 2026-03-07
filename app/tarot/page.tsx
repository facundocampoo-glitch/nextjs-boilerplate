"use client";

import { useState } from "react";
import { callMiaApi } from "@/lib/miaApi";

function isLowQualityTarotInput(value: string) {
  const text = value.trim();
  if (!text) return false;

  const normalized = text.toLowerCase();

  if (text.length < 8) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;

  const uniqueWords = new Set(words);
  if (uniqueWords.size <= 1) return true;

  const junkPatterns = [
    /^a+$/i,
    /^j+a+$/i,
    /^h+o+l+a+$/i,
    /^t+e+s+t+$/i,
    /^o+k+$/i,
    /^asdf+$/i,
    /^qwe+$/i,
    /^e+s+t+e+.*$/i,
  ];

  if (junkPatterns.some((pattern) => pattern.test(normalized))) return true;

  return false;
}

export default function TarotPage() {
  const [input, setInput] = useState("");
  const [reading, setReading] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    const trimmed = input.trim();

    if (isLowQualityTarotInput(trimmed)) {
      setError("Si vas a escribir una pregunta o tema, cuéntamelo un poco mejor.");
      setReading("");
      setAudioSrc("");
      return;
    }

    setLoading(true);
    setAudioLoading(false);
    setError("");
    setReading("");
    setAudioSrc("");

    try {
      const response = await callMiaApi({
        contentType: "tarot_marselles",
        input: trimmed,
        locale: "es-AR",
      });

      const content = response.content || "";
      setReading(content);

      if (content.trim()) {
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
          throw new Error(ttsData?.error || "No se pudo generar el audio.");
        }

        if (!ttsData?.audioBase64) {
          throw new Error("El audio no llegó correctamente.");
        }

        setAudioSrc(`data:audio/mpeg;base64,${ttsData.audioBase64}`);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Ocurrió un error al generar la lectura.";

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
          <h1 className="text-3xl font-semibold tracking-tight">
            Tarot de Marsella
          </h1>

          <p className="mt-3 text-sm text-white/70">
            Tirada completa de Tarot de Marsella.
          </p>
        </header>

        <section className="space-y-4">
          <label htmlFor="tema" className="block text-sm text-white/80">
            Pregunta o tema (opcional)
          </label>

          <textarea
            id="tema"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Opcional..."
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none transition focus:border-white/20 focus:bg-white/10"
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || audioLoading}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Tirando cartas..."
              : audioLoading
              ? "Generando audio..."
              : "Realizar tirada"}
          </button>
        </section>

        {error ? (
          <section className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-200">{error}</p>
          </section>
        ) : null}

        {audioSrc ? (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">Voz de MIA</h2>
            <audio controls src={audioSrc} className="w-full" />
          </section>
        ) : null}

        {reading ? (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">
              Lectura de Tarot
            </h2>

            <div className="whitespace-pre-wrap text-[15px] leading-7 text-white/90">
              {reading}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}