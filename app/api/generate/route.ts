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
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Body JSON inválido" }, { status: 400 });
    }

    // Opcionales para TTS (si no vienen, usamos defaults)
    const locale =
      asString((body as any)?.user_profile?.locale) || asString((body as any)?.locale) || "es-AR";
    const voice_id = asString((body as any)?.voice_id);
    const stability = asNumber((body as any)?.stability, 0.55);
    const similarity = asNumber((body as any)?.similarity, 0.85);

    // 1) Llamar /api/generate (mismo payload)
    const baseUrl = baseUrlFromReq(req);
    const gen = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const genJson = await gen.json().catch(() => null);
    if (!gen.ok || !genJson) {
      return NextResponse.json(
        { ok: false, error: "Fallo en /api/generate", details: genJson || null },
        { status: 502 }
      );
    }

    // Si /generate pide sensorial → devolver y cortar
    if (genJson?.needs_sensorial) {
      return NextResponse.json({
        ...genJson,
        chained_tts: false,
      });
    }

    const text = asString(genJson?.text).trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Generate no devolvió text válido", details: genJson },
        { status: 502 }
      );
    }

    // 2) TTS
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ ok: false, error: "Falta ELEVENLABS_API_KEY" }, { status: 500 });
    }

    const audio = await elevenTtsToBase64({
      text,
      locale,
      voice_id: voice_id || undefined,
      stability,
      similarity,
      apiKey: elevenKey,
    });

    return NextResponse.json({
      ok: true,
      text,
      audio_base64: audio.audio_base64,
      voice_id_used: audio.voice_id_used,
      locale_normalized: audio.locale_normalized,
      chained_tts: true,

      // passthrough útil de generate
      cached: !!genJson?.cached,
      memory_used: !!genJson?.memory_used,
      attempts: genJson?.attempts,
      char_count: genJson?.char_count,
      validation_reasons: genJson?.validation_reasons,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}