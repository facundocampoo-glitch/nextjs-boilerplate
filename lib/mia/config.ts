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
      "es-AR": "2hBQlTZaZFX0dHO0y3bF",
    
      "pt-BR": "XezKlk7prWCFz2gKGulA",
      "pt-PT": "fcjp97CTeheGebtw6zL2",
      "en-US": "Aa0QEjBhgN0DHiiQifLE",
      "it-IT": "ENqLMqhEn7dTrhAzJVHq",
      "de-DE": "0DoceCNfxPBnvAtymo2M",
      "fr-FR": "s7NdtjPNiNqyTlywVdTK",
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