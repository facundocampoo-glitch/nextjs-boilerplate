export type MiaContentType =
  | "cuerpo_astral"
  | "cuerpo_onirico"
  | "cuerpo_psicomagico"
  | "tarot_marselles"
  | "horoscopo_diario"
  | "horoscopo_semanal";

export type MiaLocale =
  | "es-AR"
  | "pt-PT"
  | "pt-BR"
  | "it-IT"
  | "en-US"
  | "fr-FR"
  | "de-DE";

export interface MiaRequest {
  userId: string;
  contentType: MiaContentType;
  input: string;
  locale: MiaLocale;
}

export interface MiaResponse {
  readingId: string;
  contentType: MiaContentType;
  content: string;
}