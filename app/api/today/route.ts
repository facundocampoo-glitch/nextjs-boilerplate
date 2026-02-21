export const runtime = "nodejs";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeek(): number {
  // 0 = domingo, 1 = lunes ...
  return new Date().getDay();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user_profile = body?.user_profile;

    if (!user_profile?.name) {
      return Response.json({ ok: false, error: "Falta user_profile.name" }, { status: 400 });
    }

    const today = todayISO();
    const dow = dayOfWeek();

    // v1: mismo criterio que calendar
    // Domingo → tarot_semanal (aún no implementado)
    // Resto → horoscopo_diario
    let content_type = "horoscopo_diario";
    if (dow === 0) content_type = "tarot_semanal";

    const event_key = `${content_type}:${today}`;

    // Si todavía no implementamos ese contenido, lo declaramos sin romper
    if (content_type !== "horoscopo_diario") {
      return Response.json(
        {
          ok: true,
          today,
          content_type,
          event_key,
          available: false,
          reason: "not_implemented_yet",
        },
        { status: 200 }
      );
    }

    // Llamamos al generador interno (que ya hace: cache + memoria + persistencia)
    const origin = new URL(req.url).origin;

    const r = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: "horoscopo_diario",
        user_profile,
        // no mandamos force_regenerate => usa cache normal
      }),
    });

    const data = await r.json();

    if (!r.ok || data.ok === false) {
      return Response.json(
        { ok: false, error: data.error || `Error ${r.status}` },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        today,
        content_type: "horoscopo_diario",
        event_key,
        available: true,
        text: data.text,
        cached: data.cached,
        memory_used: data.memory_used,
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
