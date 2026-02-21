export const runtime = "nodejs";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeek(): number {
  // 0 = domingo, 1 = lunes ...
  return new Date().getDay();
}

// content_types que consumen cupo mensual (v1)
function isQuotaControlled(content_type: string) {
  const ct = String(content_type || "").trim().toLowerCase();

  // Ajustá/extendé esta lista cuando sumemos módulos reales
  return (
    ct === "suenos" ||
    ct === "mirada_suenos" ||
    ct === "interpretacion_suenos" ||
    ct === "psicomagia" ||
    ct === "mirada_psicomagia"
  );
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

    // Permitimos override DEV opcional (para probar cupos sin esperar UI):
    // Si mandás body.requested_content_type, se usa ese.
    if (body?.requested_content_type) {
      content_type = String(body.requested_content_type);
    }

    const event_key = `${content_type}:${today}`;

    // Si todavía no implementamos ese contenido, lo declaramos sin romper
    if (content_type !== "horoscopo_diario" && content_type !== "suenos" && content_type !== "psicomagia") {
      return Response.json(
        {
          ok: true,
          today,
          content_type,
          event_key,
          available: false,
          allowed: false,
          reason: "not_implemented_yet",
        },
        { status: 200 }
      );
    }

    // --- 1) CUPOS (solo si aplica) ---
    // Horóscopo diario NO consume cupos.
    if (isQuotaControlled(content_type)) {
      const origin = new URL(req.url).origin;

      // 1.1 Check cupo
      const rCheck = await fetch(`${origin}/api/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          content_type,
          user_profile,
        }),
      });

      const check = await rCheck.json();

      if (!rCheck.ok || check.ok === false) {
        return Response.json(
          { ok: false, error: check.error || `Error cuota check ${rCheck.status}` },
          { status: 500 }
        );
      }

      // Esperamos que /api/quota devuelva allowed true/false
      if (check.allowed === false) {
        return Response.json(
          {
            ok: true,
            today,
            content_type,
            event_key,
            available: true,
            allowed: false,
            quota: check,
            reason: "quota_exceeded",
          },
          { status: 200 }
        );
      }

      // 1.2 Consumir cupo (solo si pasó check)
      const rConsume = await fetch(`${origin}/api/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consume",
          content_type,
          user_profile,
        }),
      });

      const consumed = await rConsume.json();

      if (!rConsume.ok || consumed.ok === false) {
        return Response.json(
          { ok: false, error: consumed.error || `Error cuota consume ${rConsume.status}` },
          { status: 500 }
        );
      }

      // Seguimos a generar (y devolvemos quota info)
      const rGen = await fetch(`${origin}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type,
          user_profile,
        }),
      });

      const gen = await rGen.json();

      if (!rGen.ok || gen.ok === false) {
        return Response.json(
          { ok: false, error: gen.error || `Error generate ${rGen.status}` },
          { status: 500 }
        );
      }

      return Response.json(
        {
          ok: true,
          today,
          content_type,
          event_key,
          available: true,
          allowed: true,
          quota: consumed,
          text: gen.text,
          cached: gen.cached,
          memory_used: gen.memory_used,
        },
        { status: 200 }
      );
    }

    // --- 2) SIN CUPOS: horoscopo_diario (lo actual) ---
    if (content_type !== "horoscopo_diario") {
      // Si llegamos acá, es porque era algo “implementado” pero no está en cupos.
      // Hoy no usamos esto, pero queda claro.
      return Response.json(
        {
          ok: true,
          today,
          content_type,
          event_key,
          available: false,
          allowed: false,
          reason: "not_available",
        },
        { status: 200 }
      );
    }

    const origin = new URL(req.url).origin;

    const r = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: "horoscopo_diario",
        user_profile,
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
        allowed: true,
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
