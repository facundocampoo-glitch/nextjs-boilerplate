// Archivo: app/api/cron/horoscopos-semanales/route.ts
// Ruta completa: app/api/cron/horoscopos-semanales/route.ts (en el boilerplate)
// Qué hacer: REEMPLAZAR el archivo completo en GitHub

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { tzPorPais, horaLocal } from "@/lib/timezone";

const SUPABASE_URL = process.env.mia_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.mia_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOILERPLATE_URL = "https://nextjs-boilerplate-psi-orpin-34.vercel.app";
const HORA_OBJETIVO = 7;
const DIA_OBJETIVO = 6; // Sabado

function calcularSignoSolar(fecha: string): string {
  if (!fecha) return "desconocido";
  const [, mes, dia] = fecha.split("-").map(Number);
  if ((mes === 3 && dia >= 21) || (mes === 4 && dia <= 19)) return "Aries";
  if ((mes === 4 && dia >= 20) || (mes === 5 && dia <= 20)) return "Tauro";
  if ((mes === 5 && dia >= 21) || (mes === 6 && dia <= 20)) return "Géminis";
  if ((mes === 6 && dia >= 21) || (mes === 7 && dia <= 22)) return "Cáncer";
  if ((mes === 7 && dia >= 23) || (mes === 8 && dia <= 22)) return "Leo";
  if ((mes === 8 && dia >= 23) || (mes === 9 && dia <= 22)) return "Virgo";
  if ((mes === 9 && dia >= 23) || (mes === 10 && dia <= 22)) return "Libra";
  if ((mes === 10 && dia >= 23) || (mes === 11 && dia <= 21)) return "Escorpio";
  if ((mes === 11 && dia >= 22) || (mes === 12 && dia <= 21)) return "Sagitario";
  if ((mes === 12 && dia >= 22) || (mes === 1 && dia <= 19)) return "Capricornio";
  if ((mes === 1 && dia >= 20) || (mes === 2 && dia <= 18)) return "Acuario";
  return "Piscis";
}

function calcularAnimalChino(fecha: string): string {
  if (!fecha) return "desconocido";
  const anio = parseInt(fecha.split("-")[0]);
  const animales = ["Rata","Buey","Tigre","Conejo","Dragón","Serpiente","Caballo","Cabra","Mono","Gallo","Perro","Cerdo"];
  return animales[(anio - 4) % 12];
}

async function supabaseGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) return [];
  return r.json();
}

async function supabaseInsert(table: string, data: Record<string, any>) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
}

async function generarSemanal(userId: string, perfil: any, tipoLectura: string, titulo: string, signoOAnimal: string, signoLabel: string) {
  const lugar = [perfil.lugar_nacimiento, perfil.pais].filter(Boolean).join(", ") || "no especificado";
  const input = `
Nombre: ${perfil.nombre || "Usuario"}
Fecha de nacimiento: ${perfil.fecha_nacimiento || "no especificada"}
Hora de nacimiento: ${perfil.hora_nacimiento || "no especificada"}
Lugar de nacimiento: ${lugar}
${signoLabel}: ${signoOAnimal}
Frecuencia: semanal
`.trim();

  const resMia = await fetch(`${BOILERPLATE_URL}/api/mia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: "horoscopo_semanal", input, userId, locale: "es-AR" }),
  });
  if (!resMia.ok) throw new Error("Error en /api/mia");
  const dataMia = await resMia.json();
  const contenido = dataMia?.content;
  if (!contenido) throw new Error("Sin contenido");

  await supabaseInsert("lecturas", {
    user_id: userId,
    tipo: tipoLectura,
    titulo,
    preview: contenido.slice(0, 200),
    contenido_completo: contenido,
    audio_base64: null,
    voz_activada: false,
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suscripciones: any[] = await supabaseGet(`suscripciones?estado=eq.active&select=user_id`);
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
      const { hora, diaSemana } = horaLocal(tz);

      if (hora !== HORA_OBJETIVO || diaSemana !== DIA_OBJETIVO) { salteados++; continue; }

      const haceSeisDias = new Date();
      haceSeisDias.setDate(haceSeisDias.getDate() - 6);
      const limite = haceSeisDias.toISOString();
      const yaGenerados: any[] = await supabaseGet(
        `lecturas?user_id=eq.${userId}&tipo=eq.horoscopo_solar_semanal&created_at=gte.${limite}&select=id`
      );
      if (yaGenerados.length > 0) { salteados++; continue; }

      try {
        const signo = calcularSignoSolar(perfil.fecha_nacimiento || "");
        const animal = calcularAnimalChino(perfil.fecha_nacimiento || "");
        await Promise.allSettled([
          generarSemanal(userId, perfil, "horoscopo_solar_semanal", "Horóscopo Solar Semanal", signo, "Signo solar"),
          generarSemanal(userId, perfil, "horoscopo_chino_semanal", "Horóscopo Chino Semanal", animal, "Animal chino"),
        ]);
        procesados++;
      } catch {
        errores++;
      }
    }

    return NextResponse.json({ ok: true, procesados, salteados, errores });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
