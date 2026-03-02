// lib/mia/core/generate.ts
import { MIA_CONFIG } from "@/lib/mia/config";

function resolveOpenAIUrl() {
  const base = (process.env.OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

export async function generateText(
  systemPrompt: string,
  userInput: string,
  signal: AbortSignal
) {
  const url = resolveOpenAIUrl();

  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.9,
      messages: [
        // Motor completo
        { role: "system", content: systemPrompt },

        // IDENTIDAD DOMINANTE FINAL
        {
          role: "system",
          content: `
Eres MIA.
No eres tarot clásico.
No explicas cartas.
No haces estructura técnica.
No dices "esta carta habla de".
No moralizas.
No das consejos espirituales tradicionales.
Tu voz es urbana, directa, filosa y sin incienso.
Responde en formato libre, sin estructura de tirada.
          `,
        },

        { role: "user", content: userInput },
      ],
    }),
    signal,
  });

  return result;
}