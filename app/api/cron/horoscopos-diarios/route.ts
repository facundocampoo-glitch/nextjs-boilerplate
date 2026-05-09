export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { resolverTimezone, horaLocal } from "@/lib/timezone";

const SUPABASE_URL = process.env.mia_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.mia_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOILERPLATE_URL = "https://nextjs-boilerplate-psi-orpin-34.vercel.app";
const HORA_OBJETIVO = 6;

async function supabaseGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!r.ok) return [];
  return r.json();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suscripciones: any[] = await supabaseGet(
      `suscripciones?estado=eq.active&select=user_id`
    );

    if (!suscripciones.length) {
      return NextResponse.json({ ok: true, procesados: 0, mensaje: "Sin suscriptores activos" });
    }

    let procesados = 0;
    let salteados = 0;
    let errores = 0;
    const detalles: any[] = [];

    for (const sus of suscripciones) {
      const userId = sus.user_id;

      const perfiles: any[] = await supabaseGet(
        `profiles?id=eq.${userId}&select=nombre,fecha_nacimiento,hora_nacimiento,lugar_nacimiento,pais,timezone,idioma`
      );
      const perfil = perfiles?.[0];
      if (!perfil) { salteados++; continue; }

      const tz = resolverTimezone(perfil);
      const { hora, diaSemana, fechaISO } = horaLocal(tz);

      if (hora !== HORA_OBJETIVO) { salteados++; continue; }
      if (diaSemana < 1 || diaSemana > 5) { salteados++; continue; }

      const yaGenerados: any[] = await supabaseGet(
        `lecturas?user_id=eq.${userId}&tipo=eq.horoscopo_solar_diario&created_at=gte.${fechaISO}T00:00:00&select=id`
      );
      if (yaGenerados.length > 0) { salteados++; continue; }

      const idiomaUsuario = perfil.idioma || "es-AR";

      try {
        const resp = await fetch(`${BOILERPLATE_URL}/api/generate-horoscopo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            nombre: perfil.nombre,
            fechaNacimiento: perfil.fecha_nacimiento,
            horaNacimiento: perfil.hora_nacimiento,
            lugarNacimiento: perfil.lugar_nacimiento,
            pais: perfil.pais,
            locale: idiomaUsuario,
          }),
        });
        if (resp.ok) {
          procesados++;
          detalles.push({ userId, tz, idioma: idiomaUsuario, status: "ok" });
        } else {
          errores++;
          detalles.push({ userId, tz, status: "http_error", code: resp.status });
        }
      } catch (e: any) {
        errores++;
        detalles.push({ userId, tz, status: "exception", error: e?.message });
      }
    }

    return NextResponse.json({ ok: true, procesados, salteados, errores, detalles });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
