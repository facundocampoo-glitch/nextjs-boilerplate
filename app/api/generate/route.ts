// app/api/generate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cleanTTS } from "@/lib/postprocess/cleanTTS";
import { validateTTSStructure } from "@/lib/validators/ttsStructure";

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asObject(v: unknown): Record<string, any> {
  return v && typeof v === "object" ? (v as any) : {};
}

function extractTextFromOpenAIResponse(json: any): string {
  try {
    // Camino típico: output[].content[].text
    const out = json?.output;
    if (Array.isArray(out)) {
      for (const item of out) {
        const content = item?.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            const t = c?.text;
            if (typeof t === "string" && t.trim()) return t.trim();
          }
        }
      }
    }

    // output_text directo (fallback)
    const ot = json?.output_text;
    if (typeof ot === "string" && ot.trim()) return ot.trim();

    return "";
  } catch {
    return "";
  }
}

function hasSensorial(user_profile: any): boolean {
  const s = asString(user_profile?.sensorial).trim();
  return s.length > 0;
}

function buildSystemPrompt(locale: string): string {
  return [
    "Sos MIA: voz femenina, urbana, filosa, sensible; cero incienso.",
    "Escribí en español rioplatense si locale es es-AR; si no, mantené el idioma del usuario.",
    "",
    "Formato OBLIGATORIO para TTS: 5 bloques separados por una línea en blanco (doble salto).",
    "Cada bloque: máximo 5 líneas. Frases respirables, puntos claros.",
    "",
    "Estructura exacta:",
    "1) Apertura breve.",
    "2) Bloque central en puntos respirables.",
    "3) Bloque de tensión o trampa.",
    "4) Bloque de acción concreta (mínimo 1 acción hoy).",
    "5) Cierre humano + filo.",
    "",
    "Prohibido: explicaciones técnicas, Jung/Freud/psicoanálisis/chamanismo.",
    "No uses listas técnicas ni paréntesis largos. No uses comillas innecesarias.",
  ].join("\n");
}

function buildUserPrompt(body: any): string {
  const content_type = asString(body?.content_type || "suenos").trim();
  const input_text = asString(body?.input_text).trim();
  const user_profile = asObject(body?.user_profile);

  const name = asString(user_profile?.name).trim();
  const locale = asString(user_profile?.locale || body?.locale || "es-AR").trim();
  const sensorial = asString(user_profile?.sensorial).trim();

  const sign = asString(user_profile?.sign).trim();
  const chinese_animal = asString(user_profile?.chinese_animal).trim();
  const delivery_time_pref = asString(user_profile?.delivery_time_pref).trim();

  return [
    `content_type: ${content_type}`,
    name ? `nombre: ${name}` : "",
    `locale: ${locale}`,
    sign ? `signo: ${sign}` : "",
    chinese_animal ? `animal chino: ${chinese_animal}` : "",
    delivery_time_pref ? `preferencia entrega: ${delivery_time_pref}` : "",
    sensorial ? `sensorial: ${sensorial}` : "",
    "",
    "input_text:",
    input_text,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Body JSON inválido" }, { status: 400 });
    }

    const user_profile = asObject((body as any)?.user_profile);
    const locale = asString(user_profile?.locale || (body as any)?.locale || "es-AR") || "es-AR";

    // 0) Si falta sensorial → pedirlo (regla del proyecto)
    if (!hasSensorial(user_profile)) {
      return NextResponse.json({
        ok: true,
        needs_sensorial: true,
        prompt_sensorial:
          "Antes de seguir: ¿cómo fue el sueño en el cuerpo y en la escena? (colores, intensidad, textura, presión/temperatura, sonido, emoción dominante). En una línea.",
      });
    }

    // 1) OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Falta OPENAI_API_KEY" }, { status: 500 });
    }

    const system = buildSystemPrompt(locale);
    const user = buildUserPrompt(body);
    const model = asString((body as any)?.model) || "gpt-4o-mini";

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const json = await r.json().catch(() => null);
    if (!r.ok || !json) {
      return NextResponse.json(
        { ok: false, error: "Fallo OpenAI /v1/responses", details: json },
        { status: 502 }
      );
    }

    let text = extractTextFromOpenAIResponse(json);
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "OpenAI no devolvió texto utilizable", details: json },
        { status: 502 }
      );
    }

    // 2) Post-procesado TTS
    const cleaned = cleanTTS(text, { expectedBlocks: 5, maxLinesPerBlock: 5, maxChars: 1200 });
    text = cleaned.text;

    // 3) Validación estructura
    const validation = validateTTSStructure(text, { expectedBlocks: 5, maxLinesPerBlock: 5 });

    return NextResponse.json({
      ok: true,
      text,

      attempts: 1,
      char_count: text.length,
      validation_ok: validation.ok,
      validation_reasons: validation.reasons,

      cached: false,
      memory_used: false,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}