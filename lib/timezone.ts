// Archivo: lib/timezone.ts
// Ruta completa: lib/timezone.ts (en el boilerplate)
// Qué hacer: CREAR archivo nuevo en GitHub

export const TIMEZONE_BY_PAIS: Record<string, string> = {
  ar: "America/Argentina/Buenos_Aires",
  br: "America/Sao_Paulo",
  pt: "Europe/Lisbon",
  en: "America/New_York",
  us: "America/New_York",
  ru: "Europe/Moscow",
  fr: "Europe/Paris",
  it: "Europe/Rome",
  de: "Europe/Berlin",
};

export function tzPorPais(pais?: string | null): string {
  if (!pais) return "America/Argentina/Buenos_Aires";
  const key = pais.trim().toLowerCase();
  return TIMEZONE_BY_PAIS[key] || "America/Argentina/Buenos_Aires";
}

export function horaLocal(tz: string): { hora: number; diaSemana: number; fechaISO: string } {
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(ahora);
  const hora = parseInt(partes.find(p => p.type === "hour")?.value || "0", 10);
  const weekdayStr = partes.find(p => p.type === "weekday")?.value || "Mon";
  const diaSemanaMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const diaSemana = diaSemanaMap[weekdayStr] ?? 1;
  const year = partes.find(p => p.type === "year")?.value || "0000";
  const month = partes.find(p => p.type === "month")?.value || "01";
  const day = partes.find(p => p.type === "day")?.value || "01";
  return { hora, diaSemana, fechaISO: `${year}-${month}-${day}` };
}
