export const runtime = "nodejs";

import { CONTENT_TYPES } from "@/lib/content-types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeek(): number {
  return new Date().getDay(); // 0 = domingo
}

function isQuotaControlled(content_type: string) {
  return (
    content_type === CONTENT_TYPES.SUENOS ||
    content_type === CONTENT_TYPES.PSICOMAGIA
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user_profile = body?.user_profile;

    if (!user_profile?.name) {
      return Response.json(
        { ok: false, error: "Falta user_profile.name" },
        { status: 400 }
      );
    }

    const today = todayISO();
    const dow = dayOfWeek();

    let content_type = CONTENT_TYPES.HOROSCOPO_DIARIO;

    if (dow === 0) {
      content_type = CONTENT_TYPES.TAROT_SEMANAL;
    }

    if (body?.requested_content_type) {
      content_type = body.requested_content_type;
    }

    const event_key = `${content_type}:${today}`;

    if (
      content_type !== CONTENT_TYPES.HOROSCOPO_DIARIO &&
      content_type !== CONTENT_TYPES.SUENOS &&
      content_type !== CONTENT_TYPES.PSICOMAGIA
    ) {
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

    const origin = new URL(req.url).origin;

    // --- CUPOS ---
    if (isQuotaControlled(content_type)) {
      const rCheck = await fetch(`${origin}/api/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          module: content_type,
          user_profile,
        }),
      });

      const check = await rCheck.json();

      if (!rCheck.ok || check.ok === false) {
        return Response.json(
          { ok: false, error: check.error },
          { status: 500 }
        );
      }

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

      const rConsume = await fetch(`${origin}/api/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consume",
          module: content_type,
          user_profile,
        }),
      });

      const consumed = await rConsume.json();

      if (!rConsume.ok || consumed.ok === false) {
        return Response.json(
          { ok: false, error: consumed.error },
          { status: 500 }
        );
      }

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
          { ok: false, error: gen.error },
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

    // --- SIN CUPOS (horoscopo_diario) ---
    const r = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type,
        user_profile,
      }),
    });

    const data = await r.json();

    if (!r.ok || data.ok === false) {
      return Response.json(
        { ok: false, error: data.error },
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
