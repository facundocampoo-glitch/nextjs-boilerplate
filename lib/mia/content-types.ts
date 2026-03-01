// lib/mia/content-types.ts

export const CONTENT_TYPES = {
  GENERATE: "generate",
  GENERATE_TTS: "generate_tts",
  TAROT: "tarot",
  TAROT_TTS: "tarot_tts",
} as const;

export type ContentType =
  (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];