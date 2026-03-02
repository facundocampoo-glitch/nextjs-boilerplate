// lib/mia/content-types.ts

export const CONTENT_TYPES = {
  TAROT: "tarot",
  TAROT_TTS: "tarot_tts",
  SUENOS: "suenos",
} as const;

export type ContentType =
  (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];