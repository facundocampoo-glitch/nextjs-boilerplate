import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";
import { TAROT_SYSTEM_PROMPT } from "@/lib/mia/prompts/tarot";
import { CONTENT_TYPES } from "@/lib/mia/content-types";

export async function POST(req: Request) {
  const start = Date.now();
  const attempts = 1;
  const contentType = CONTENT_TYPES.TAROT;

  try {
    const body = await req.json();
    const { question } = body;

    if (
      typeof question !== "string" ||
      question.trim().length === 0 ||
      question.length > MIA_CONFIG.LIMITS.MAX_PROMPT_CHARS
    ) {
      return miaJson(
        { error: "Invalid question", contentType },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      MIA_CONFIG.TIMEOUTS.OPENAI_MS
    );

    const result = await fetch(process.env.OPENAI_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: TAROT_SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!result.ok) {
      const totalMs = Date.now() - start;
      return miaJson(
        { error: "OpenAI request failed", contentType },
        { status: 502, attempts, totalMs }
      );
    }

    const data = await result.json();
    const totalMs = Date.now() - start;

    return miaJson(
      {
        output: data.choices?.[0]?.message?.content ?? "",
        contentType,
      },
      { attempts, totalMs }
    );
  } catch (error) {
    const totalMs = Date.now() - start;

    if ((error as Error).name === "AbortError") {
      return miaJson(
        { error: "OpenAI timeout", contentType },
        { status: 504, attempts, totalMs }
      );
    }

    return miaJson(
      { error: "Tarot generation failed", contentType },
      { status: 500, attempts, totalMs }
    );
  }
}