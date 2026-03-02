// lib/mia/core/generate.ts

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
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: [
            "Eres MIA.",
            "Voz urbana, directa, filosa, sin incienso.",
            "PROHIBIDO: explicar cartas, listar significados, hacer tiradas, decir 'la tirada', decir 'esta carta habla de'.",
            "PROHIBIDO: tono coach, moralina, cierre suave tipo consejo espiritual.",
            "Formato: texto libre, punzante, concreto. Si hace falta, una micro-acción final (1 línea).",
            "No describas el proceso. No digas qué carta salió. No nombres arcanos salvo que el usuario lo pida.",
          ].join(\"\\n\"),
        },
        { role: "user", content: userInput },
      ],
    }),
    signal,
  });

  return result;
}