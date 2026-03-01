// lib/mia/config.ts

export const MIA_CONFIG = {
  VERSION: "1.0.0",

  LIMITS: {
    MAX_PROMPT_CHARS: 5000,
    MAX_RESPONSE_CHARS: 12000,
    MAX_TTS_CHARS: 5000,
  },

  TIMEOUTS: {
    OPENAI_MS: 20000,
    ELEVEN_MS: 20000,
  },

  VOICE: {
    DEFAULT_LOCALE: "es-AR",
    MAP: {
      "es-AR": "mia_es_ar",
      "es-ES": "mia_es_es",
      "pt-BR": "mia_pt_br",
      "en-US": "mia_en_us",
      "it-IT": "mia_it_it",
      "de-DE": "mia_de_de",
    },
  },

  HEADERS: {
    ATTEMPTS: "x-mia-attempts",
    ELEVEN_MS: "x-mia-eleven-ms",
    TOTAL_MS: "x-mia-total-ms",
    VALIDATION: "x-mia-validation",
  },

  FLAGS: {
    ENABLE_METRICS: true,
    ENABLE_LOGS: true,
    STRICT_VALIDATION: true,
  },
};