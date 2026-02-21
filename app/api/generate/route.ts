export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { CONTENT_TYPES } from "@/lib/content-types";
import { getPromptTemplate } from "@/prompts/registry";

// ------------------ Helpers ------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUserIdFromProfile(user_profile: any): string {
  const n = String(user_profile?.name || "anon").trim().toLowerCase();
  return n.replace(/\s+/g, "_");
}

function applyTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function zodiacSign(birth_date: string) {
  const parts = String(birth_date || "").split("-");
  if (parts.length !== 3) return "Desconocido";
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if ((m == 3 && d >= 21) || (m == 4 && d <= 19)) return "Aries";
  if ((m == 4 && d >= 20) || (m == 5 && d <= 20)) return "Tauro";
  if ((m == 5 && d >= 21) || (m == 6 && d <= 20)) return "Géminis";
  if ((m == 6 && d >= 21) || (m == 7 && d <= 22)) return "Cáncer";
  if ((m == 7 && d >= 23) || (m == 8 && d <= 22)) return "Leo";
  if ((m == 8 && d >= 23) || (m == 9 && d <= 22)) return "Virgo";
  if ((m == 9 && d >= 23) || (m == 10 && d <= 22)) return "Libra";
  if ((m == 10 && d >= 23) || (m == 11 && d <= 21)) return "Escorpio";
  if ((m == 11 && d >= 22) || (m == 12 && d <= 21)) return "Sagitario";
  if ((m == 12 && d >= 22) || (m == 1 && d <= 19)) return "Capricornio";
  if ((m == 1 && d >= 20) || (m == 2 && d <= 18)) return "Acuario";
  return "Piscis";
}

function chineseZodiac(year: number) {
  const animals = [
    "Rata", "Buey", "Tigre", "Conejo", "Dragón", "Serpiente",
    "Caballo", "Cabra", "Mono", "Gallo", "Perro", "Cerdo",
  ];
  const idx = (year - 4) % 12;
  return animals[(idx + 12) % 12];
}

// ------------------ API ------------------

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const content_type = String(body?.content_type || "").trim();
    const user_profile = body?.user_profile;
    const input_text = body?.input_text ? String(body.input_text) : "";
    const question = body?.question ? String(body.question) : "";

    if (!content_type) {
      return NextResponse.json({ ok: false, error: "Falta content_type" }, { status: 400 });
    }

    if (!user_profile) {
      return NextResponse.json({ ok: false, error: "Falta user_profile" }, { status: 400 });
    }

    const required = ["name", "birth_date", "birth_time", "birth_place", "language", "delivery_time_pref"];
    for (const k of required) {
      if (!user_profile?.[k]) {
        return NextResponse.json({ ok: false, error: `Falta user_profile.${k}` }, { status: 400 });
      }
    }

    const template = getPromptTemplate(content_type);
    if (!template) {
      return NextResponse.json(
        { ok: false, error: `No hay template para ${content_type}` },
        { status: 400 }
      );
    }

    const sign = zodiacSign(user_profile.birth_date);
    const year = parseInt(String(user_profile.birth_date).slice(0, 4), 10);
    const animal = chineseZodiac(year);

    const now = new Date();
    const month_label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const prompt = applyTemplate(template, {
      language: String(user_profile.language || "es"),
      name: String(user_profile.name || ""),
      birth_date: String(user_profile.birth_date || ""),
      birth_time: String(user_profile.birth_time || ""),
      birth_place: String(user_profile.birth_place || ""),
      sign: String(sign),
      SIGN_UPPER: String(sign).toUpperCase(),
      chinese_animal: String(animal),
      input_text,
      question_or_blank: question || "(sin pregunta)",
      month_label,
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Falta OPENAI_API_KEY" }, { status: 500 });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: await r.text() }, { status: 500 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      ok: true,
      text,
      cached: false,
      memory_used: false,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
