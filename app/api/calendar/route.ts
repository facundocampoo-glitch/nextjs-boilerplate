export const runtime = "nodejs";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeek(): number {
  // 0 = domingo, 1 = lunes ...
  return new Date().getDay();
}

export async function GET() {
  try {
    const today = todayISO();
    const dow = dayOfWeek();

    // v2: regla simple
    // Domingo → tarot_semanal
    // Resto → horoscopo_diario
    let content_type = "horoscopo_diario";

    if (dow === 0) {
      content_type = "tarot_semanal";
    }

    // v2: event_key para persistencia/caché
    // (por ahora: usamos fecha; luego haremos semana ISO real)
    const event_key = `${content_type}:${today}`;

    return Response.json(
      {
        ok: true,
        today,
        content_type,
        event_key,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
