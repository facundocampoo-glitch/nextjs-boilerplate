// lib/mia/prompts/index.ts

import { TAROT_SYSTEM_PROMPT } from "./tarot";
import { SUENOS_SYSTEM_PROMPT } from "./suenos";

export const SYSTEM_PROMPTS = {
  tarot: TAROT_SYSTEM_PROMPT,
  tarot_tts: TAROT_SYSTEM_PROMPT,
  suenos: SUENOS_SYSTEM_PROMPT,
} as const;