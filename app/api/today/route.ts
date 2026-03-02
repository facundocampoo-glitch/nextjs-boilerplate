import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";
import { SYSTEM_PROMPTS } from "@/lib/mia/prompts";
import { generateText } from "@/lib/mia/core/generate";

export async function POST(req: Request) {
  const start = Date.now();
  const attempts = 1;

  try {
    const body = await req.json();
    const { input } = body;

    if (
      typeof input !== "string" ||
      input.trim().length === 0 ||
      input.length > MIA_CONFIG.LIMITS.MAX_PROMPT_CHARS
    ) {
      return miaJson({ error: "Invalid input" }, { status: 400 });
    }

    const systemPrompt =
      SYSTEM_PROMPTS["today"] ?? SYSTEM_PROMPTS["generate"] ?? "";

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      MIA_CONFIG.TIMEOUTS.OPENAI_MS
    );

    const res = await generateText(systemPrompt, input, controller.signal);

    clearTimeout(timeout);

    if (!res.ok) {
      const totalMs = Date.now() - start;
      return miaJson(
        { error: "OpenAI request failed" },
        { status: 502, attempts, totalMs }
      );
    }

    const data = await res.json();
    const output = data.choices?.[0]?.message?.content ?? "";

    const totalMs = Date.now() - start;

    return miaJson({ output }, { attempts, totalMs });
  } catch (error) {
    const totalMs = Date.now() - start;

    if ((error as Error).name === "AbortError") {
      return miaJson({ error: "Timeout" }, { status: 504, attempts, totalMs });
    }

    return miaJson(
      { error: "Today request failed" },
      { status: 500, attempts, totalMs }
    );
  }
}