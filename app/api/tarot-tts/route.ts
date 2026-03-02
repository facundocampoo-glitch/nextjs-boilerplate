import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";
import { TAROT_SYSTEM_PROMPT } from "@/lib/mia/prompts/tarot";
import { CONTENT_TYPES } from "@/lib/mia/content-types";
import { generateText } from "@/lib/mia/core/generate";
import { synthesizeSpeech } from "@/lib/mia/core/tts";

type VoiceMap = typeof MIA_CONFIG.VOICE.MAP;
type LocaleKey = keyof VoiceMap;

function isLocaleKey(value: unknown, map: VoiceMap): value is LocaleKey {
  return typeof value === "string" && value in map;
}

export async function POST(req: Request) {
  const start = Date.now();
  const attempts = 1;
  const contentType = CONTENT_TYPES.TAROT_TTS;

  try {
    const body = await req.json();
    const { question, locale } = body;

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

    // 1️⃣ Generar texto

    const textController = new AbortController();
    const textTimeout = setTimeout(
      () => textController.abort(),
      MIA_CONFIG.TIMEOUTS.OPENAI_MS
    );

    const textRes = await generateText(
      TAROT_SYSTEM_PROMPT,
      question,
      textController.signal
    );

    clearTimeout(textTimeout);

    if (!textRes.ok) {
      const totalMs = Date.now() - start;
      return miaJson(
        { error: "OpenAI request failed", contentType },
        { status: 502, attempts, totalMs }
      );
    }

    const data = await textRes.json();
    const textOutput = data.choices?.[0]?.message?.content ?? "";

    // 2️⃣ Convertir a audio

    const voiceMap = MIA_CONFIG.VOICE.MAP;

    const safeLocale: LocaleKey = isLocaleKey(locale, voiceMap)
      ? locale
      : (MIA_CONFIG.VOICE.DEFAULT_LOCALE as LocaleKey);

    const voiceId = voiceMap[safeLocale];

    const audioController = new AbortController();
    const audioTimeout = setTimeout(
      () => audioController.abort(),
      MIA_CONFIG.TIMEOUTS.ELEVEN_MS
    );

    const elevenStart = Date.now();

    const elevenRes = await synthesizeSpeech(
      voiceId,
      textOutput,
      audioController.signal
    );

    clearTimeout(audioTimeout);

    if (!elevenRes.ok) {
      const totalMs = Date.now() - start;
      return miaJson(
        { error: "ElevenLabs request failed", contentType },
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
        { error: "Timeout", contentType },
        { status: 504, attempts, totalMs }
      );
    }

    return miaJson(
      { error: "Tarot TTS failed", contentType },
      { status: 500, attempts, totalMs }
    );
  }
}