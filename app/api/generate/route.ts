import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";

const OPENAI_TIMEOUT_MS = 20000;

export async function POST(req: Request) {
  const start = Date.now();
  let attempts = 1;

  try {
    const body = await req.json();
    const { prompt } = body;

    if (
      typeof prompt !== "string" ||
      prompt.trim().length === 0 ||
      prompt.length > MIA_CONFIG.LIMITS.MAX_PROMPT_CHARS
    ) {
      return miaJson({ error: "Invalid prompt" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const result = await fetch(process.env.OPENAI_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!result.ok) {
      const totalMs = Date.now() - start;
      return miaJson(
        { error: "OpenAI request failed" },
        { status: 502, attempts, totalMs }
      );
    }

    const data = await result.json();
    const totalMs = Date.now() - start;

    return miaJson(
      { output: data.choices?.[0]?.message?.content ?? "" },
      { attempts, totalMs }
    );
  } catch (error) {
    const totalMs = Date.now() - start;

    if ((error as Error).name === "AbortError") {
      return miaJson(
        { error: "OpenAI timeout" },
        { status: 504, attempts, totalMs }
      );
    }

    return miaJson(
      { error: "Generation failed" },
      { status: 500, attempts, totalMs }
    );
  }
}