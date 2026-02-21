import { NextResponse } from "next/server";
import { CONTENT_TYPES } from "@/lib/content-types";

function isQuotaControlled(content_type: string) {
  return content_type === CONTENT_TYPES.SUENOS || content_type === CONTENT_TYPES.PSICOMAGIA;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user_profile = body?.user_profile;

    if (!user_profile?.name) {
      return NextResponse.json({ ok: false, error: "Falta user_profile.name" }, { status: 400 });
    }

    const origin = new URL(req.url).origin;

    // 1) Calendar decide qué toca hoy
    const rCal = await fetch(`${origin}/api/calendar`, { method: "GET" });
    const cal = await rCal.json();

    if (!rCal.ok || cal.ok === false) {
      return NextResponse.json(
        { ok: false, error: cal?.error || "Error calendar" },
        { status: 500 }
      );
    }

    // 2) Override DEV opcional
    const content_type = body?.requested_content_type
      ? String(body.requested_content_type)
      : String(cal.content_type);

    const today = String(cal.today);
    const event_key = `${content_type}:${today}`;

    // 3) Si requiere input_text, exigirlo
    const input_text = body?.input_text ? String(body.input_text) : "";
    if (isQuotaControlled(content_type) && !input_text.trim()) {
      return NextResponse.json(
        {
          ok: true,
          today,
          content_type,
          event_key,
          available: true,
          allowed: false,
          reason: "missing_input_text",
        },
        { status: 200 }
      );
    }

    // 4) Cupos (solo si aplica)
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
        return NextResponse.json(
          { ok: false, error: check?.error || "Error quota check" },
          { status: 500 }
        );
      }

      if (check.allowed === false) {
        return NextResponse.json(
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
        return NextResponse.json(
          { ok: false, error: consumed?.error || "Error quota consume" },
          { status: 500 }
        );
      }

      // Generar contenido cupo
      const rGen = await fetch(`${origin}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type,
          user_profile,
          input_text,
        }),
      });

      const gen = await rGen.json();

      if (!rGen.ok || gen.ok === false) {
        return NextResponse.json(
          { ok: false, error: gen?.error || "Error generate" },
          { status: 500 }
        );
      }

      return NextResponse.json(
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

    // 5) Sin cupos: horóscopo / tarot / etc.
    const question = body?.question ? String(body.question) : "";

    const r = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type,
        user_profile,
        question,
      }),
    });

    const data = await r.json();

    if (!r.ok || data.ok === false) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Error generate" },
        { status: 500 }
      );
    }

    return NextResponse.json(
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
    return NextResponse.json(
      { ok: false, error: e?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
