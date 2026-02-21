export const CONTENT_TYPES = {
  HOROSCOPO_DIARIO: "horoscopo_diario",
  HOROSCOPO_SEMANAL: "horoscopo_semanal",
  TAROT_SEMANAL: "tarot_semanal",
  TAROT_MENSUAL: "tarot_mensual",
  MIRADA_ASTRAL: "mirada_astral",
  SUENOS: "suenos",
  PSICOMAGIA: "psicomagia",
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

export function isContentType(x: any): x is ContentType {
  return Object.values(CONTENT_TYPES).includes(String(x) as any);
}
