// Archivo: app/api/cron/horoscopos-diarios/route.ts
// Ruta completa: app/api/cron/horoscopos-diarios/route.ts (en el boilerplate)
// Qué hacer: CREAR archivo nuevo en GitHub

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { tzPorPais, horaLocal } from "@/lib/timezone";

const SUPABASE_URL = process.env.mia_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.mia_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOILERPLATE_URL = "https://nextjs-boilerplate-psi-orpin-34.vercel.app";
const HORA_OBJETIVO = 7;

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

    for (const sus of suscripciones) {
      const userId = sus.user_id;

      const perfiles: any[] = await supabaseGet(
        `profiles?id=eq.${userId}&select=nombre,fecha_nacimiento,hora_nacimiento,lugar_nacimiento,pais`
      );
      const perfil = perfiles?.[0];
      if (!perfil) { salteados++; continue; }

      const tz = tzPorPais(perfil.pais);
      const { hora, fechaISO } = horaLocal(tz);

      if (hora !== HORA_OBJETIVO) { salteados++; continue; }

      const yaGenerados: any[] = await supabaseGet(
        `lecturas?user_id=eq.${userId}&tipo=eq.horoscopo_solar_diario&created_at=gte.${fechaISO}T00:00:00&select=id`
      );
      if (yaGenerados.length > 0) { salteados++; continue; }

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
            locale: "es-AR",
          }),
        });
        if (resp.ok) procesados++; else errores++;
      } catch {
        errores++;
      }
    }

    return NextResponse.json({ ok: true, procesados, salteados, errores });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
