// lib/mia/prompts/index.ts

import { TAROT_SYSTEM_PROMPT } from "./tarot";
import { CONTENT_TYPES } from "@/lib/mia/content-types";

export const SYSTEM_PROMPTS = {
  [CONTENT_TYPES.TAROT]: TAROT_SYSTEM_PROMPT,
  [CONTENT_TYPES.TAROT_TTS]: TAROT_SYSTEM_PROMPT,
} as const;// lib/mia/prompts/index.ts

import { TAROT_SYSTEM_PROMPT } from "./tarot";
import { SUENOS_SYSTEM_PROMPT } from "./suenos";

export const SYSTEM_PROMPTS = {
  tarot: TAROT_SYSTEM_PROMPT,
  suenos: SUENOS_SYSTEM_PROMPT,
} as const;