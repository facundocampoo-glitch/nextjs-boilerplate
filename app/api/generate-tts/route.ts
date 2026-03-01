import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";
import { miaJson } from "@/lib/mia/response";

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
    const { text, locale } = body;

    if (
      typeof text !== "string" ||
      text.trim().length === 0 ||
      text.length > MIA_CONFIG.LIMITS.MAX_TTS_CHARS
    ) {
      return miaJson({ error: "Invalid text" }, { status: 400 });
    }

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
          text,
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
    return miaJson({ error: "TTS failed" }, { status: 500 });
  }
}