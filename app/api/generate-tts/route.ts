// app/api/generate-tts/route.ts
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

function now() {
  return Date.now();
}

function baseUrlFromReq(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

function safeFilePart(s: string): string {
  return (s || "u")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 40);
}

function timestamp(): string {
  const d = new Date();
  return d.toISOString().replace(/:/g, "-");
}

export async function POST(req: Request) {
  const t0 = now();

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const user_id = safeFilePart(asString((body as any)?.user_id));
    const locale =
      asString((body as any)?.user_profile?.locale) ||
      asString((body as any)?.locale) ||
      "es-AR";

    const voice_id = asString((body as any)?.voice_id);
    const stability = asNumber((body as any)?.stability, 0.55);
    const similarity = asNumber((body as any)?.similarity, 0.85);

    // GENERATE
    const baseUrl = baseUrlFromReq(req);
    const genRes = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const genJson = await genRes.json();
    if (!genRes.ok) {
      return NextResponse.json({ ok: false, error: "generate failed" }, { status: 502 });
    }

    if (genJson?.needs_sensorial) {
      return NextResponse.json({ ...genJson, chained_tts: false });
    }

    const text = asString(genJson?.text);
    if (!text) {
      return NextResponse.json({ ok: false, error: "No text" }, { status: 502 });
    }

    // ELEVEN
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ ok: false, error: "No ELEVEN key" }, { status: 500 });
    }

    const tEleven = now();

    const audio = await elevenTtsToBase64({
      text,
      locale,
      voice_id: voice_id || undefined,
      stability,
      similarity,
      apiKey: elevenKey,
    });

    const ms_eleven = now() - tEleven;
    const ms_total = now() - t0;

    console.log("[MIA]", {
      user_id,
      attempts: genJson?.attempts,
      validation_ok: genJson?.validation_ok,
      ms_eleven,
      ms_total,
    });

    const mp3 = Buffer.from(audio.audio_base64, "base64");

    const filename = `${user_id || "u"}_${timestamp()}.mp3`;

    return new NextResponse(mp3, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-MIA-Eleven-ms": String(ms_eleven),
        "X-MIA-Total-ms": String(ms_total),
        "X-MIA-Attempts": String(genJson?.attempts || 1),
        "X-MIA-Validation": String(genJson?.validation_ok ?? true),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}