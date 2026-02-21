export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt, content_type, user_profile } = await req.json();
    let finalPrompt = prompt;

if (!finalPrompt && content_type === "horoscopo_diario" && user_profile) {
  finalPrompt = `
MODO: HOROSCOPO_DIARIO (MIA)

DATOS_USUARIO:
- NOMBRE: ${user_profile.name}
- FECHA_NAC: ${user_profile.birth_date}
- HORA_NAC: ${user_profile.birth_time}
- LUGAR_NAC: ${user_profile.birth_place}
- IDIOMA: ${user_profile.language}
- HORARIO_PREFERIDO: ${user_profile.delivery_time_pref}

REGLAS:
- 1400–1600 caracteres con espacios.
- Aire visual: bloques cortos 1–3 líneas.
- Apertura: “SIGNO — HOY.”
- Peligro + Oportunidad.
- 3 micro-gestos: cuerpo / vínculo / trabajo-dinero.
- Un “NO” del día.
- Cierre único.

TAREA:
Hacé el horóscopo diario para HOY. 100% personalizado. Integrá lo chino y lo astral sin explicar.
Entregar SOLO el texto final.
  `.trim();
}
    if (!prompt) {
      return Response.json(
        { ok: false, error: "Falta prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, error: "Falta OPENAI_API_KEY" },
        { status: 500 }
      );
    }

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
      return Response.json(
        { ok: false, error: err },
        { status: 500 }
      );
    }

    const data = await r.json();

    const text =
      data.output?.[0]?.content?.[0]?.text ||
      "No vino texto.";

    return Response.json({ ok: true, text });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
