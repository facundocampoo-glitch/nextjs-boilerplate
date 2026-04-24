// Archivo: lib/tts/voice-map.ts
// Ruta completa: lib/tts/voice-map.ts (en el boilerplate de Next.js)
// Qué hacer: REEMPLAZAR el archivo completo en GitHub

export const VOICE_BY_LOCALE: Record<string, string> = {
  "es-AR": "2hBQlTZaZFX0dHO0y3bF",
  "pt-BR": "XezKlk7prWCFz2gKGulA",
  "pt-PT": "fcjp97CTeheGebtw6zL2",
  "en-US": "Aa0QEjBhgN0DHiiQifLE",
  "it-IT": "ENqLMqhEn7dTrhAzJVHq",
  "fr-FR": "s7NdtjPNiNqyTlywVdTK",
  "de-DE": "0DoceCNfxPBnvAtymo2M",
  "ru-RU": "d6C0xVhdUg8gm4qfPytd",
};

export function normalizeLocale(locale: string): string {
  const raw = (locale || "").trim();
  const low = raw.toLowerCase();
  if (low === "frances" || low === "français" || low === "fr") return "fr-FR";
  if (low === "aleman" || low === "alemán" || low === "de") return "de-DE";
  if (low === "ruso" || low === "russian" || low === "ru") return "ru-RU";
  if (/^[a-z]{2}[-_][a-z]{2}$/i.test(raw)) {
    const [a, b] = raw.replace("_", "-").split("-");
    return `${a.toLowerCase()}-${b.toUpperCase()}`;
  }
  return raw;
}

export function pickVoiceId(locale: string, explicitVoiceId?: string): string {
  if (explicitVoiceId && explicitVoiceId.trim()) return explicitVoiceId.trim();
  const norm = normalizeLocale(locale);
  if (norm && VOICE_BY_LOCALE[norm]) return VOICE_BY_LOCALE[norm];
  return VOICE_BY_LOCALE["es-AR"];
}
