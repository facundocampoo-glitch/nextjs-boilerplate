// lib/mia/prompts/index.ts

import { TAROT_SYSTEM_PROMPT } from "./tarot";
import { CONTENT_TYPES } from "@/lib/mia/content-types";

export const SYSTEM_PROMPTS = {
  [CONTENT_TYPES.TAROT]: TAROT_SYSTEM_PROMPT,
  [CONTENT_TYPES.TAROT_TTS]: TAROT_SYSTEM_PROMPT,
} as const;