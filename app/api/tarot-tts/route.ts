import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";
import { TAROT_SYSTEM_PROMPT } from "@/lib/mia/prompts/tarot";

type VoiceMap = typeof MIA_CONFIG.VOICE.MAP;
type LocaleKey = keyof VoiceMap;

function isLocaleKey(value: unknown, map: VoiceMap): value is LocaleKey {
  return typeof value === "string" && value in map;
}

export async function POST(req: Request) {
  const start = Date.now();
  let attempts = 1;

  try {
    const body = await req.json();
    const { question, locale } = body;

    if (
      typeof question !== "string" ||
      question.trim().length === 0 ||
      question.length > MIA_CONFIG.LIMITS.MAX_PROMPT_CHARS
    ) {
      return miaJson({ error: "Invalid question" }, { status: 400 });
    }

    // 1️⃣ Generar texto Tarot

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
        { error: "OpenAI request failed" },
        { status: 502, attempts, totalMs }
      );
    }

    const data = await result.json();
    const textOutput = data.choices?.[0]?.message?.content ?? "";

    // 2️⃣ Convertir a audio

    const voiceMap = MIA_CONFIG.VOICE.MAP;

    const safeLocale: LocaleKey = isLocaleKey(locale, voiceMap)
      ? locale
      : (MIA_CONFIG.VOICE.DEFAULT_LOCALE as LocaleKey);

    const voiceId = voiceMap[safeLocale];

    const elevenStart = Date.now();

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: textOutput,
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!elevenRes.ok) {
      const totalMs = Date.now() - start;
      return miaJson(
        { error: "ElevenLabs request failed" },
        { status: 502, attempts, totalMs }
      );
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const elevenMs = Date.now() - elevenStart;
    const totalMs = Date.now() - start;

    return new NextResponse(Buffer.from(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        [MIA_CONFIG.HEADERS.ATTEMPTS]: String(attempts),
        [MIA_CONFIG.HEADERS.ELEVEN_MS]: String(elevenMs),
        [MIA_CONFIG.HEADERS.TOTAL_MS]: String(totalMs),
        [MIA_CONFIG.HEADERS.VALIDATION]: "true",
      },
    });
  } catch (error) {
    const totalMs = Date.now() - start;

    if ((error as Error).name === "AbortError") {
      return miaJson(
        { error: "Timeout" },
        { status: 504, attempts, totalMs }
      );
    }

    return miaJson(
      { error: "Tarot TTS failed" },
      { status: 500, attempts, totalMs }
    );
  }
}