export const runtime = "nodejs";

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

// (v1) Animal chino simplificado
function chineseZodiac(year: number) {
  const animals = [
    "Rata", "Buey", "Tigre", "Conejo", "Dragón", "Serpiente",
    "Caballo", "Cabra", "Mono", "Gallo", "Perro", "Cerdo",
  ];
  const idx = (year - 4) % 12;
  return animals[(idx + 12) % 12];
}

function buildDailyHoroscopePrompt(user_profile: any) {
  const sign = zodiacSign(user_profile.birth_date);
  const year = parseInt(String(user_profile.birth_date).slice(0, 4), 10);
  const animal = chineseZodiac(year);

  return `
Actuás como Mia: filo urbano, sin incienso, con humor contenido. Aire visual: bloques cortos.
Idioma: ${user_profile.language || "es"}.

Datos:
- Nombre: ${user_profile.name}
- Signo solar: ${sign}
- Animal chino: ${animal}
- Lugar nacimiento: ${user_profile.birth_place}

Tarea:
Generá HORÓSCOPO DIARIO para hoy.

Formato:

**${sign.toUpperCase()} — HOY.**

Párrafo breve (2–3 líneas) que abra el día.

Luego 3 bloques:

**Peligro:** (1–2 líneas)
**Oportunidad:** (1–2 líneas)
**Micro-gestos:** (2–4 bullets cortos)

No expliques astrología. No uses lenguaje místico. Operá.
`.trim();
}

// --------- Supabase REST (sin instalar librerías) ---------
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
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase select error: ${t}`);
  }
  const arr = await r.json();
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
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

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase upsert error: ${t}`);
  }
}

async function sbInsert(table: string, row: any) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}`;
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  // Si choca el UNIQUE, Supabase suele devolver 409
  if (r.status === 409) return { ok: true, duplicate: true };

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase insert error: ${t}`);
  }
  return { ok: true, duplicate: false };
}

// --------- API ---------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = body?.prompt;
    const content_type = body?.content_type;
    const user_profile = body?.user_profile;

    // 1) Si NO es horóscopo diario, exigimos prompt
    if (content_type !== "horoscopo_diario" && !prompt) {
      return Response.json({ ok: false, error: "Falta prompt" }, { status: 400 });
    }

    // 2) Si ES horóscopo diario, exigimos user_profile completo
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
          return Response.json(
            { ok: false, error: `Falta user_profile.${k}` },
            { status: 400 }
          );
        }
      }
    }

    // 3) Cache server-side SOLO para horoscopo_diario
    if (content_type === "horoscopo_diario") {
      const date_key = todayISO();
      const user_id = normalizeUserIdFromProfile(user_profile);
      const event_key = `horoscopo_diario:${date_key}`;

      // 3.1) Guardar/actualizar perfil
      await sbUpsert("user_profiles", [
        {
          user_id,
          profile_json: user_profile,
          updated_at: new Date().toISOString(),
        },
      ]);

      // 3.2) Buscar si ya existe el texto de hoy
      const cached = await sbSelectOne(
        "generated_events",
        `select=output_text&user_id=eq.${encodeURIComponent(user_id)}&event_key=eq.${encodeURIComponent(
          event_key
        )}&limit=1`
      );

      if (cached?.output_text) {
        return Response.json({ ok: true, text: cached.output_text, cached: true }, { status: 200 });
      }
    }

    // 4) Construimos prompt final
    let finalPrompt = prompt;
    if (content_type === "horoscopo_diario") {
      finalPrompt = buildDailyHoroscopePrompt(user_profile);
    }

    // 5) Llamada a OpenAI (igual que antes)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ ok: false, error: "Falta OPENAI_API_KEY" }, { status: 500 });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: finalPrompt }],
        temperature: 0.9,
      }),
    });

    if (!r.ok) {
      const raw = await r.text();
      return Response.json({ ok: false, error: raw }, { status: 500 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    // 6) Guardar en cache si era horoscopo_diario
    if (content_type === "horoscopo_diario") {
      const date_key = todayISO();
      const user_id = normalizeUserIdFromProfile(user_profile);
      const event_key = `horoscopo_diario:${date_key}`;

      await sbInsert("generated_events", {
        user_id,
        content_type: "horoscopo_diario",
        event_key,
        date_key,
        output_text: text,
      });
    }

    return Response.json({ ok: true, text, cached: false }, { status: 200 });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}
