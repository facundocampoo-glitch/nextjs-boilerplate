// Mapa de fallback por país, solo para usuarios viejos que aun no tienen
// timezone guardada en su perfil. Cada usuario nuevo guarda su timezone
// real del navegador en profiles.timezone al iniciar sesion.

export const TIMEZONE_BY_PAIS: Record<string, string> = {
  ar: "America/Argentina/Buenos_Aires",
  argentina: "America/Argentina/Buenos_Aires",
  br: "America/Sao_Paulo",
  brasil: "America/Sao_Paulo",
  brazil: "America/Sao_Paulo",
  pt: "Europe/Lisbon",
  portugal: "Europe/Lisbon",
  en: "America/New_York",
  us: "America/New_York",
  usa: "America/New_York",
  "estados unidos": "America/New_York",
  ru: "Europe/Moscow",
  rusia: "Europe/Moscow",
  russia: "Europe/Moscow",
  fr: "Europe/Paris",
  francia: "Europe/Paris",
  france: "Europe/Paris",
  it: "Europe/Rome",
  italia: "Europe/Rome",
  italy: "Europe/Rome",
  de: "Europe/Berlin",
  alemania: "Europe/Berlin",
  germany: "Europe/Berlin",
  es: "Europe/Madrid",
  espana: "Europe/Madrid",
  españa: "Europe/Madrid",
  spain: "Europe/Madrid",
  mx: "America/Mexico_City",
  mexico: "America/Mexico_City",
  méxico: "America/Mexico_City",
  cl: "America/Santiago",
  chile: "America/Santiago",
  uy: "America/Montevideo",
  uruguay: "America/Montevideo",
  pe: "America/Lima",
  peru: "America/Lima",
  perú: "America/Lima",
  co: "America/Bogota",
  colombia: "America/Bogota",
  ve: "America/Caracas",
  venezuela: "America/Caracas",
  ec: "America/Guayaquil",
  ecuador: "America/Guayaquil",
  bo: "America/La_Paz",
  bolivia: "America/La_Paz",
  py: "America/Asuncion",
  paraguay: "America/Asuncion",
};

export function tzPorPais(pais?: string | null): string {
  if (!pais) return "America/Argentina/Buenos_Aires";
  const key = pais.trim().toLowerCase();
  return TIMEZONE_BY_PAIS[key] || "America/Argentina/Buenos_Aires";
}

// Resuelve la timezone real del usuario.
// Prioridad: 1) timezone guardada en profiles, 2) fallback por pais.
export function resolverTimezone(perfil: { timezone?: string | null; pais?: string | null }): string {
  if (perfil?.timezone && perfil.timezone.trim().length > 0) {
    return perfil.timezone;
  }
  return tzPorPais(perfil?.pais);
}

export function horaLocal(tz: string): { hora: number; diaSemana: number; fechaISO: string } {
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(ahora);
  const horaStr = partes.find(p => p.type === "hour")?.value || "0";
  const hora = parseInt(horaStr, 10) % 24;
  const weekdayStr = partes.find(p => p.type === "weekday")?.value || "Mon";
  const diaSemanaMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const diaSemana = diaSemanaMap[weekdayStr] ?? 1;
  const year = partes.find(p => p.type === "year")?.value || "0000";
  const month = partes.find(p => p.type === "month")?.value || "01";
  const day = partes.find(p => p.type === "day")?.value || "01";
  return { hora, diaSemana, fechaISO: `${year}-${month}-${day}` };
}
