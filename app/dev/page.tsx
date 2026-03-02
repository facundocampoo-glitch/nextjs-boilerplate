"use client";

import { useState } from "react";
import { miaText } from "@/lib/mia/client";
import { CONTENT_TYPES } from "@/lib/mia/content-types";

export default function DevPage() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutput("");

    try {
      const res = await miaText({
        contentType: CONTENT_TYPES.GENERATE,
        input: prompt,
      });

      setOutput(res.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dev Playground</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full min-h-[140px] rounded-xl border p-3"
          placeholder="Escribí algo..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />

        <button
          type="submit"
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
          disabled={loading || prompt.trim().length === 0}
        >
          {loading ? "Generando..." : "Generar"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border p-3">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {output && (
        <div className="rounded-xl border p-3 whitespace-pre-wrap">
          {output}
        </div>
      )}
    </main>
  );
}