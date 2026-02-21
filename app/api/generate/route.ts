export const runtime = "nodejs";
import { getPromptTemplate } from "@/prompts/registry";
// --------- Helpers de fecha / usuario ---------
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUserIdFromProfile(user_profile: any): string {
  const n = String(user_profile?.name || "anon").trim().toLowerCase();
  return n.replace(/\s+/g, "_");
}

// --------- Helpers astro mínimos ---------
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
function applyTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}
function buildDailyHoroscopePrompt(user_profile: any) {
  const template = getPromptTemplate("horoscopo_diario");

  // fallback seguro: si por algún motivo no existe el template
  if (!template) {
    return `
Actuás como Mia: filo urbano, sin incienso, con humor contenido. Aire visual: bloques cortos.
Idioma: ${user_profile.language || "es"}.

Datos:
- Nombre: ${user_profile.name}
- Lugar nacimiento: ${user_profile.birth_place}

Tarea:
Generá HORÓSCOPO DIARIO para hoy.
`.trim();
  }

  const sign = zodiacSign(user_profile.birth_date);
  const year = parseInt(String(user_profile.birth_date).slice(0, 4), 10);
  const animal = chineseZodiac(year);

  const filled = applyTemplate(template, {
    language: String(user_profile.language || "es"),
    name: String(user_profile.name || ""),
    sign: String(sign),
    chinese_animal: String(animal),
    birth_place: String(user_profile.birth_place || ""),
    SIGN_UPPER: String(sign).toUpperCase(),
  });

  return filled;
}

// --------- Supabase REST ---------
function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_REST_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url) throw new Error("Falta SUPABASE URL (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL)");
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");

  return { url, serviceKey };
}

async function sbSelectOne(table: string, query: string) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const r = await fetch(endpoint, {
    method: "GET",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!r.ok) throw new Error(`Supabase select error: ${await r.text()}`);
  const arr = await r.json();
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

async function sbSelectMany(table: string, query: string) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const r = await fetch(endpoint, {
    method: "GET",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!r.ok) throw new Error(`Supabase select error: ${await r.text()}`);
  const arr = await r.json();
  return Array.isArray(arr) ? arr : [];
}

async function sbUpsert(table: string, rows: any[]) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}`;
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase upsert error: ${await r.text()}`);
}

async function sbUpsertEvent(row: any) {
  const { url, serviceKey } = getSupabaseConfig();
  // upsert usando el UNIQUE(user_id,event_key)
  const endpoint = `${url}/rest/v1/generated_events?on_conflict=user_id,event_key`;
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([row]),
  });
  if (!r.ok) throw new Error(`Supabase upsert generated_events error: ${await r.text()}`);
}

// --------- Memoria -> texto de prompt ---------
function formatMemoryForPrompt(items: Array<{ kind?: string; content?: string }>) {
  if (!items || items.length === 0) return "";
  const lines = items
    .slice(0, 8)
    .map((it) => {
      const k = String(it?.kind || "nota").trim();
      const c = String(it?.content || "").trim();
      if (!c) return null;
      return `- (${k}) ${c}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return "";

  return `
Memoria activa del usuario (hechos/patrones). Usala para afinar el texto, sin explicarla:
${lines.join("\n")}
`.trim();
}

// --------- API ---------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = body?.prompt;
    const content_type = body?.content_type;
    const user_profile = body?.user_profile;
    const force_regenerate = Boolean(body?.force_regenerate);

    if (content_type !== "horoscopo_diario" && !prompt) {
      return Response.json({ ok: false, error: "Falta prompt" }, { status: 400 });
    }

    if (content_type === "horoscopo_diario") {
      if (!user_profile) {
        return Response.json({ ok: false, error: "Falta user_profile" }, { status: 400 });
      }

      const required = [
        "name",
        "birth_date",
        "birth_time",
        "birth_place",
        "language",
        "delivery_time_pref",
      ];

      for (const k of required) {
        if (!user_profile?.[k]) {
          return Response.json({ ok: false, error: `Falta user_profile.${k}` }, { status: 400 });
        }
      }
    }

    let memory_used = false;
    let memoryBlock = "";

    // Cache + memoria solo para horoscopo_diario
    if (content_type === "horoscopo_diario") {
      const date_key = todayISO();
      const user_id = normalizeUserIdFromProfile(user_profile);
      const event_key = `horoscopo_diario:${date_key}`;

      // Perfil
      await sbUpsert("user_profiles", [
        { user_id, profile_json: user_profile, updated_at: new Date().toISOString() },
      ]);

      // Memoria
      const memItems = await sbSelectMany(
        "memory_items",
        `select=kind,content,score&user_id=eq.${encodeURIComponent(user_id)}&is_active=eq.true&order=score.desc,updated_at.desc&limit=8`
      );
      memoryBlock = formatMemoryForPrompt(memItems);
      memory_used = Boolean(memoryBlock);

      // Cache: si NO forzás, devolvemos lo guardado
      if (!force_regenerate) {
        const cached = await sbSelectOne(
          "generated_events",
          `select=output_text&user_id=eq.${encodeURIComponent(user_id)}&event_key=eq.${encodeURIComponent(
            event_key
          )}&limit=1`
        );

        if (cached?.output_text) {
          return Response.json(
            { ok: true, text: cached.output_text, cached: true, memory_used },
            { status: 200 }
          );
        }
      }
    }

    // Prompt final
    let finalPrompt = prompt;

    if (content_type === "horoscopo_diario") {
      const base = buildDailyHoroscopePrompt(user_profile);
      finalPrompt = memoryBlock ? `${base}\n\n${memoryBlock}` : base;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ ok: false, error: "Falta OPENAI_API_KEY" }, { status: 500 });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: finalPrompt }],
        temperature: 0.9,
      }),
    });

    if (!r.ok) return Response.json({ ok: false, error: await r.text() }, { status: 500 });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    // Guardar/actualizar cache si era horoscopo_diario
    if (content_type === "horoscopo_diario") {
      const date_key = todayISO();
      const user_id = normalizeUserIdFromProfile(user_profile);
      const event_key = `horoscopo_diario:${date_key}`;

      await sbUpsertEvent({
        user_id,
        content_type: "horoscopo_diario",
        event_key,
        date_key,
        output_text: text,
      });
    }

    return Response.json({ ok: true, text, cached: false, memory_used }, { status: 200 });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}
