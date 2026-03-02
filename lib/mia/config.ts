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
      "es-AR": "PEGAR_ID_REAL_ES_AR",
      "es-ES": "PEGAR_ID_REAL_ES_ES",
      "pt-BR": "PEGAR_ID_REAL_PT_BR",
      "en-US": "PEGAR_ID_REAL_EN_US",
      "it-IT": "PEGAR_ID_REAL_IT_IT",
      "de-DE": "PEGAR_ID_REAL_DE_DE",
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