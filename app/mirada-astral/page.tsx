"use client";

import { useState } from "react";
import { callMiaApi } from "@/lib/miaApi";

export default function MiradaAstralPage() {
  const [reading, setReading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setReading("");

    try {
      const response = await callMiaApi({
        contentType: "cuerpo_astral",
        input: "",
        locale: "es-AR",
      });

      setReading(response.content || "");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Ocurrió un error al generar la lectura.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Mirada Astral
          </h1>

          <p className="mt-3 text-sm text-white/70">
            Tu lectura base: carta astral, horóscopo solar y horóscopo chino.
          </p>
        </header>

        <section className="space-y-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generando lectura..." : "Generar lectura base"}
          </button>
        </section>

        {error ? (
          <section className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-200">{error}</p>
          </section>
        ) : null}

        {reading ? (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-medium">
              Tu lectura astral
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