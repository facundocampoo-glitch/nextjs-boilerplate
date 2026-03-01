import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";

export async function POST(req: Request) {
  const start = Date.now();
  let attempts = 1;

  try {
    const body = await req.json();
    const { text, locale = MIA_CONFIG.VOICE.DEFAULT_LOCALE } = body;

    if (!text || text.length > MIA_CONFIG.LIMITS.MAX_TTS_CHARS) {
      return NextResponse.json(
        { error: "Invalid text" },
        { status: 400 }
      );
    }

    const voiceId =
      MIA_CONFIG.VOICE.MAP[locale as keyof typeof MIA_CONFIG.VOICE.MAP] ||
      MIA_CONFIG.VOICE.MAP[MIA_CONFIG.VOICE.DEFAULT_LOCALE];

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
    return NextResponse.json(
      { error: "TTS failed" },
      { status: 500 }
    );
  }
}