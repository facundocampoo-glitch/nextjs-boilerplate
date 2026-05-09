// Archivo: app/api/cron/pregenerar/route.ts
// Ruta completa: app/api/cron/pregenerar/route.ts (en boilerplate Next.js)
// Qué hacer: CREAR archivo nuevo

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.mia_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.mia_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOILERPLATE_URL = "https://nextjs-boilerplate-psi-orpin-34.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET!;

async function supabaseSelect(query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
  return res.json();
}

function getHoraLocal(timezone: string): { hora: number; diaSemana: number } {
  try {
    const ahora = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
      weekday: "short",
    });
    const partes = fmt.formatToParts(ahora);
    const horaStr = partes.find((p) => p.type === "hour")?.value || "0";
    const diaStr = partes.find((p) => p.type === "weekday")?.value || "Mon";
    const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { hora: parseInt(horaStr) % 24, diaSemana: dias[diaStr] ?? 1 };
  } catch {
    return { hora: -1, diaSemana: -1 };
  }
}

function inicioDelDiaUTC(timezone: string): string {
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const fechaLocal = fmt.format(ahora);
  return new Date(`${fechaLocal}T00:00:00Z`).toISOString();
}

async function yaTieneLecturaHoy(userId: string, tipo: string, timezone: string): Promise<boolean> {
  const inicio = inicioDelDiaUTC(timezone);
  const query = `lecturas?user_id=eq.${userId}&tipo=eq.${tipo}&created_at=gte.${inicio}&select=id&limit=1`;
  const data = await supabaseSelect(query);
  return Array.isArray(data) && data.length > 0;
}

async function generarParaUsuario(perfil: any, esSabado: boolean) {
  const tipos: string[] = ["horoscopo_solar_diario", "horoscopo_chino_diario"];
  if (esSabado) {
    tipos.push("horoscopo_solar_semanal", "horoscopo_chino_semanal");
  }

  const tipoBase = ["horoscopo_solar_diario", "horoscopo_chino_diario"];
  const necesitaGenerar = await Promise.all(
    tipoBase.map((t) => yaTieneLecturaHoy(perfil.id, t, perfil.timezone))
  );
  if (necesitaGenerar.every((v) => v)) {
    return { userId: perfil.id, status: "skipped" };
  }

  const payload = {
    userId: perfil.id,
    nombre: perfil.nombre || "Usuario",
    fechaNacimiento: perfil.fecha_nacimiento || "",
    horaNacimiento: perfil.hora_nacimiento || "",
    lugarNacimiento: perfil.lugar_nacimiento || "",
    pais: perfil.pais || "",
    locale: perfil.idioma || "es-AR",
    incluirSemanal: esSabado,
  };

  try {
    await fetch(`${BOILERPLATE_URL}/api/generate-horoscopo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { userId: perfil.id, status: "ok" };
  } catch (err: any) {
    return { userId: perfil.id, status: "error", error: err?.message };
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suscripciones = await supabaseSelect(
      `suscripciones?estado=eq.active&select=user_id`
    );

    if (!Array.isArray(suscripciones) || suscripciones.length === 0) {
      return NextResponse.json({ ok: true, procesados: 0, mensaje: "Sin suscriptores activos" });
    }

    const userIds = suscripciones.map((s: any) => s.user_id).filter(Boolean);
    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, procesados: 0 });
    }

    const idsParam = userIds.join(",");
    const perfiles = await supabaseSelect(
      `profiles?id=in.(${idsParam})&select=id,nombre,fecha_nacimiento,hora_nacimiento,lugar_nacimiento,pais,timezone,idioma`
    );

    if (!Array.isArray(perfiles)) {
      return NextResponse.json({ ok: true, procesados: 0 });
    }

    const aGenerar = perfiles.filter((p: any) => {
      if (!p.timezone) return false;
      const { hora, diaSemana } = getHoraLocal(p.timezone);
      if (hora !== 6) return false;
      if (diaSemana === 0) return false; // domingo no
      return true;
    });

    const resultados = await Promise.allSettled(
      aGenerar.map((p: any) => {
        const { diaSemana } = getHoraLocal(p.timezone);
        return generarParaUsuario(p, diaSemana === 6);
      })
    );

    const ok = resultados.filter((r) => r.status === "fulfilled").length;
    const errores = resultados.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      ok: true,
      total_suscriptores: perfiles.length,
      a_generar_esta_hora: aGenerar.length,
      generados_ok: ok,
      errores,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
