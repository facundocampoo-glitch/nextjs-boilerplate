export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = body?.prompt;
    const content_type = body?.content_type;
    const user_profile = body?.user_profile;

    // 1) Si NO es horóscopo diario, exigimos prompt como siempre
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ ok: false, error: "Falta OPENAI_API_KEY" }, { status: 500 });
    }

    // --- Helpers mínimos (sin librerías) ---
    function solarSignFromDate(dateISO: string) {
      const [y, mStr, dStr] = dateISO.split("-");
      const m = parseInt(mStr, 10);
      const d = parseInt(dStr, 10);

      if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Aries";
      if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Tauro";
      if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Géminis";
      if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Cáncer";
      if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Leo";
      if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Virgo";
      if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Libra";
      if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Escorpio";
      if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Sagitario";
      if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Capricornio";
      if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Acuario";
      return "Piscis";
    }

    function ageFromDate(dateISO: string) {
      const [y, m, d] = dateISO.split("-").map((x: string) => parseInt(x, 10));
      const now = new Date();
      let age = now.getFullYear() - y;
      const mm = now.getMonth() + 1;
      const dd = now.getDate();
      if (mm < m || (mm === m && dd < d)) age--;
      return age;
    }

    const chineseAnimals = [
      "Rata",
      "Buey",
      "Tigre",
      "Conejo",
      "Dragón",
      "Serpiente",
      "Caballo",
      "Cabra",
      "Mono",
      "Gallo",
      "Perro",
      "Cerdo",
    ];

    function chineseAnimalFromYear(year: number) {
      const idx = (year - 4) % 12;
      return chineseAnimals[(idx + 12) % 12];
    }

    // Ajuste simple: si nació hasta 20/02, usamos año anterior
    function chineseYearAdjusted(dateISO: string) {
      const [yStr, mStr, dStr] = dateISO.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const d = parseInt(dStr, 10);

      if (m === 1) return y - 1;
      if (m === 2 && d <= 20) return y - 1;
      return y;
    }

    // 3) Construimos el prompt final
    let finalPrompt: string = prompt;

    if (content_type === "horoscopo_diario") {
      const solar = solarSignFromDate(user_profile.birth_date);
      const age = ageFromDate(user_profile.birth_date);
      const cy = chineseYearAdjusted(user_profile.birth_date);
      const animal = chineseAnimalFromYear(cy);
      const today = new Date().toISOString().slice(0, 10);

      finalPrompt = `
MODO: HOROSCOPO_DIARIO (MIA)

DATOS_USUARIO:
- NOMBRE: ${user_profile.name}
- FECHA_NAC: ${user_profile.birth_date}
- HORA_NAC: ${user_profile.birth_time}
- LUGAR_NAC: ${user_profile.birth_place}
- EDAD_APROX: ${age}
- SIGNO_SOLAR: ${solar}
- ANIMAL_CHINO (año ${cy}): ${animal}
- IDIOMA: ${user_profile.language}
- HORARIO_PREFERIDO: ${user_profile.delivery_time_pref}

REGLAS OBLIGATORIAS:
- Longitud final 1400–1600 caracteres con espacios.
- Aire visual: bloques 1–3 líneas, saltos, cero párrafos largos.
- Prohibido: “VIÑETA”.
- Apertura directa: “${solar.toUpperCase()} — HOY.”
- Corte de realidad: peligro + oportunidad.
- 3 micro-gestos: cuerpo / vínculo / trabajo-dinero.
- Un “NO” del día.
- Cierre único variable (A/B/C) y no clonado.

INTEGRACION:
- 100% personalizado: occidental + chino + perfil astral guardado (sin didactismo).
- No explicar astrología. Operar. No prometer. No asustar.
- Humor/ironía: urbano con filo amable, sin crueldad.

TAREA:
Escribí el HOROSCOPO_DIARIO para HOY (${today}) usando la voz Mia.
Entregar SOLO el texto final.
      `.trim();
    }

    // 4) Llamada a OpenAI
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: finalPrompt,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return Response.json({ ok: false, error: err }, { status: 500 });
    }

    const data = await r.json();
    const text = data.output?.[0]?.content?.[0]?.text || "No vino texto.";

    return Response.json({ ok: true, text });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
