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

function nowMs(): number {
  return Date.now();
}

function extractTextFromOpenAIResponse(json: any): string {
  try {
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

async function callOpenAI(args: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<{ ok: boolean; text: string; ms: number; raw?: any }> {
  const t0 = nowMs();
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      input: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  const raw = await r.json().catch(() => null);
  const ms = nowMs() - t0;

  if (!r.ok || !raw) return { ok: false, text: "", ms, raw };
  const text = extractTextFromOpenAIResponse(raw);
  return { ok: !!text, text: text || "", ms, raw };
}

function buildRepairHint(reasons: string[]): string {
  const r = reasons.length ? reasons.join(" | ") : "Estructura inválida.";
  return [
    "",
    "CORRECCIÓN OBLIGATORIA:",
    "Reescribí TODO cumpliendo ESTRICTO 5 bloques con doble salto entre bloques.",
    "Ningún bloque > 5 líneas.",
    "El bloque 4 debe contener UNA micro-acción hoy (imperativo claro).",
    "Sin didáctica (no Jung/Freud/psicoanálisis/chamanismo).",
    `Errores detectados: ${r}`,
  ].join("\n");
}

export async function POST(req: Request) {
  const tStart = nowMs();

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Falta OPENAI_API_KEY" }, { status: 500 });
    }

    const system = buildSystemPrompt(locale);
    const baseUser = buildUserPrompt(body);
    const model = asString((body as any)?.model) || "gpt-4o-mini";

    const maxAttempts = 3;

    let attempts = 0;
    let ms_openai_total = 0;

    let lastText = "";
    let lastValidation = { ok: false, reasons: ["Sin intento aún."], blocks: [] as string[] };
    let lastCleanNotes: string[] = [];

    let userPrompt = baseUser;

    while (attempts < maxAttempts) {
      attempts += 1;

      // 1) OpenAI
      const oa = await callOpenAI({ apiKey, model, system, user: userPrompt });
      ms_openai_total += oa.ms;

      if (!oa.ok) {
        // Si OpenAI no devolvió texto, intentamos otra vez con hint más duro
        userPrompt = baseUser + buildRepairHint(["OpenAI no devolvió texto utilizable."]);
        lastText = "";
        lastValidation = { ok: false, reasons: ["OpenAI no devolvió texto utilizable."], blocks: [] };
        continue;
      }

      // 2) clean
      const tClean0 = nowMs();
      const cleaned = cleanTTS(oa.text, { expectedBlocks: 5, maxLinesPerBlock: 5, maxChars: 1200 });
      const ms_clean = nowMs() - tClean0;

      lastText = cleaned.text;
      lastCleanNotes = cleaned.notes || [];

      // 3) validate
      const tVal0 = nowMs();
      const validation = validateTTSStructure(lastText, { expectedBlocks: 5, maxLinesPerBlock: 5 });
      const ms_validate = nowMs() - tVal0;

      lastValidation = validation;

      // Si OK → salimos
      if (validation.ok) {
        const total_ms = nowMs() - tStart;
        return NextResponse.json({
          ok: true,
          text: lastText,
          attempts,
          char_count: lastText.length,
          validation_ok: true,
          validation_reasons: [],
          clean_notes: lastCleanNotes,

          // observabilidad mínima (C parte 1)
          ms_openai_total,
          ms_clean,
          ms_validate,
          ms_total: total_ms,

          cached: false,
          memory_used: false,
        });
      }

      // Si NO ok → reintentar con hint basado en reasons
      userPrompt = baseUser + buildRepairHint(validation.reasons);
    }

    // Si agotamos intentos → devolvemos lo mejor que tengamos + reasons
    const total_ms = nowMs() - tStart;
    return NextResponse.json({
      ok: true,
      text: lastText,
      attempts,
      char_count: lastText.length,
      validation_ok: lastValidation.ok,
      validation_reasons: lastValidation.reasons,
      clean_notes: lastCleanNotes,

      ms_openai_total,
      ms_total: total_ms,

      cached: false,
      memory_used: false,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}