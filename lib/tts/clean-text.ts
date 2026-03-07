export function cleanTextForTts(text: string): string {
  if (!text) return "";

  let t = text;

  // quitar bloques tipo encabezado
  t = t.replace(/^#+\s.*$/gm, "");

  // quitar comillas dobles largas
  t = t.replace(/["“”]/g, "");

  // quitar múltiples saltos
  t = t.replace(/\n{3,}/g, "\n\n");

  // quitar espacios duplicados
  t = t.replace(/\s{2,}/g, " ");

  return t.trim();
}