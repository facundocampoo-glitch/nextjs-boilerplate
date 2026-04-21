export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOILERPLATE_URL = "https://nextjs-boilerplate-psi-orpin-34.vercel.app";

async function supabaseInsert(table: string, data: Record<string, any>) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, nombre, fechaNacimiento, horaNacimiento, lugarNacimiento, pais } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const signo = calcularSignoSolar(fechaNacimiento || "");
    const animalChino = calcularAnimalChino(fechaNacimiento || "");
    const lugar = [lugarNacimiento, pais].filter(Boolean).join(", ") || "no especificado";

    const input = `
Nombre: ${nombre || "Usuario"}
Fecha de nacimiento: ${fechaNacimiento || "no especificada"}
Hora de nacimiento: ${horaNacimiento || "no especificada"}
Lugar de nacimiento: ${lugar}
Signo solar: ${signo}
Animal chino: ${animalChino}
`.trim();

    const resMia = await fetch(`${BOILERPLATE_URL}/api/mia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "cuerpo_astral", input, userId }),
    });

    if (!resMia.ok) throw new Error("Error en /api/mia");
    const dataMia = await resMia.json();
    const contenido = dataMia?.content;
    if (!contenido) throw new Error("Sin contenido");

    let audioBase64: string | null = null;
    try {
      const resTts = await fetch(`${BOILERPLATE_URL}/api/generate-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contenido, locale: "es-AR" }),
      });
      if (resTts.ok) {
        const dataTts = await resTts.json();
        audioBase64 = dataTts?.audioBase64 ?? dataTts?.audio_base64 ?? null;
      }
    } catch {}

    await supabaseInsert("lecturas", {
      user_id: userId,
      tipo: "mirada_astral",
      titulo: "Mirada Astral",
      preview: contenido.slice(0, 200),
      contenido_completo: contenido,
      audio_base64: audioBase64,
      voz_activada: false,
    });

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
