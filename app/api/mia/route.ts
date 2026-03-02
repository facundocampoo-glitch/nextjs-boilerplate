import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";
import { CONTENT_TYPES } from "@/lib/mia/content-types";
import { SYSTEM_PROMPTS } from "@/lib/mia/prompts";
import { generateText } from "@/lib/mia/core/generate";
import { synthesizeSpeech } from "@/lib/mia/core/tts";

type VoiceMap = typeof MIA_CONFIG.VOICE.MAP;
type LocaleKey = keyof VoiceMap;

function isLocaleKey(value: unknown, map: VoiceMap): value is LocaleKey {
  return typeof value === "string" && value in map;
}

function isTtsType(contentType: string) {
  return (
    contentType === CONTENT_TYPES.TAROT_TTS ||
    contentType === CONTENT_TYPES.GENERATE_TTS
  );
}

export async function POST(req: Request) {
  const start = Date.now();
  const attempts = 1;

  try {
    const body = await req.json();
    const { contentType, input, locale } = body;

    if (typeof contentType !== "string") {
      return miaJson({ error: "Invalid contentType" }, { status: 400 });
    }

    if (
      typeof input !== "string" ||
      input.trim().length === 0 ||
      input.length > MIA_CONFIG.LIMITS.MAX_PROMPT_CHARS
    ) {
      return miaJson({ error: "Invalid input", contentType }, { status: 400 });
    }

    const systemPrompt =
      (SYSTEM_PROMPTS as Record<string, string | undefined>)[contentType] ?? "";

    // 1) texto
    const textController = new AbortController();
    const textTimeout = setTimeout(
      () => textController.abort(),
      MIA_CONFIG.TIMEOUTS.OPENAI_MS
    );

    const textRes = await generateText(
      systemPrompt,
      input,
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
    const outputText = data.choices?.[0]?.message?.content ?? "";

    // 2) JSON si no es TTS
    if (!isTtsType(contentType)) {
      const totalMs = Date.now() - start;
      return miaJson({ output: outputText, contentType }, { attempts, totalMs });
    }

    // 3) TTS
    if (outputText.length > MIA_CONFIG.LIMITS.MAX_TTS_CHARS) {
      return miaJson(
        { error: "Output too long for TTS", contentType },
        { status: 413, attempts }
      );
    }

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
      outputText,
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
      return miaJson({ error: "Timeout" }, { status: 504, attempts, totalMs });
    }

    return miaJson(
      { error: "MIA request failed" },
      { status: 500, attempts, totalMs }
    );
  }
}