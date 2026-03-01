// lib/mia/core/generate.ts

import { MIA_CONFIG } from "@/lib/mia/config";

export async function generateText(
  systemPrompt: string,
  userInput: string,
  signal: AbortSignal
) {
  const result = await fetch(process.env.OPENAI_ENDPOINT!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
    }),
    signal,
  });

  return result;
}