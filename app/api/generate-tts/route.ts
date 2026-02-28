export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { elevenTtsToBase64 } from "@/lib/tts/eleven";

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function baseUrlFromReq(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Body JSON inválido" },
        { status: 400 }
      );
    }

    const locale =
      asString((body as any)?.user_profile?.locale) ||
      asString((body as any)?.locale) ||
      "es-AR";

    const voice_id = asString((body as any)?.voice_id);
    const stability = asNumber((body as any)?.stability, 0.55);
    const similarity = asNumber((body as any)?.similarity, 0.85);

    // 1) generar texto
    const baseUrl = baseUrlFromReq(req);

    const genRes = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const genJson = await genRes.json().catch(() => null);
    if (!genRes.ok || !genJson) {
      return NextResponse.json(
        { ok: false, error: "Fallo en /api/generate", details: genJson },
        { status: 502 }
      );
    }

    if (genJson?.needs_sensorial) {
      return NextResponse.json({
        ...genJson,
        chained_tts: false,
      });
    }

    const text = asString(genJson?.text).trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Generate no devolvió text válido" },
        { status: 502 }
      );
    }

    // 2) tts
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json(
        { ok: false, error: "Falta ELEVENLABS_API_KEY" },
        { status: 500 }
      );
    }

    const audio = await elevenTtsToBase64({
      text,
      locale,
      voice_id: voice_id || undefined,
      stability,
      similarity,
      apiKey: elevenKey,
    });

    // devolvemos MP3 directo (no JSON)
    const mp3Buffer = Buffer.from(audio.audio_base64, "base64");

    return new NextResponse(mp3Buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-MIA-Voice-Id": audio.voice_id_used,
        "X-MIA-Locale": audio.locale_normalized,
        // si querés el texto, lo podés pedir aparte en /api/generate
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}