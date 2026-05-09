export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { resolverTimezone, horaLocal } from "@/lib/timezone";

const SUPABASE_URL = process.env.mia_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.mia_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOILERPLATE_URL = "https://nextjs-boilerplate-psi-orpin-34.vercel.app";
const HORA_OBJETIVO = 6;
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
