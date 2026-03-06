export type MiaContentType =
  | "mirada_astral"
  | "horoscopo_solar_diario"
  | "horoscopo_chino_diario"
  | "tarot_semanal"
  | "tarot_mensual_5mas5"
  | "suenos"
  | "psicomagia";

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