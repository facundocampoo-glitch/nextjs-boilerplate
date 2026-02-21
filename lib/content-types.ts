export const CONTENT_TYPES = {
  HOROSCOPO_DIARIO: "horoscopo_diario",
  TAROT_SEMANAL: "tarot_semanal",
  SUENOS: "suenos",
  PSICOMAGIA: "psicomagia",
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

export function isContentType(x: any): x is ContentType {
  return Object.values(CONTENT_TYPES).includes(String(x) as any);
}
