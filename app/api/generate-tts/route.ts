import { NextRequest, NextResponse } from "next/server";
import { elevenTtsToBase64 } from "@/lib/tts/eleven";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const text =
      typeof body?.text === "string" ? body.text.trim() : "";

    const locale =
      typeof body?.locale === "string" ? body.locale : "es-AR";

    if (!text) {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY" },
        { status: 500 }
      );
    }

    const result = await elevenTtsToBase64({
      text,
      locale,
      apiKey,
    });

    return NextResponse.json({
      audioBase64: result.audio_base64,
      voiceId: result.voice_id_used,
      locale: result.locale_normalized,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "TTS error" },
      { status: 500 }
    );
  }
}