// lib/validators/ttsStructure.ts

export type TTSValidationResult = {
  ok: boolean;
  reasons: string[];
  blocks: string[];
};

type ValidateOptions = {
  expectedBlocks?: number; // default 5
  maxLinesPerBlock?: number; // default 5
  minBlocks?: number; // default 5
  forbidDidacticTerms?: boolean; // default true
};

const DEFAULTS: Required<ValidateOptions> = {
  expectedBlocks: 5,
  maxLinesPerBlock: 5,
  minBlocks: 5,
  forbidDidacticTerms: true,
};

const FORBIDDEN_TERMS = [
  "jung",
  "freud",
  "chamánico",
  "chamanico",
  "chamanismo",
  "psicoanálisis",
  "psicoanalisis",
];

const ACTION_HINTS = [
  "hoy",
  "ahora",
  "hacé",
  "hace",
  "haz",
  "andá",
  "anda",
  "escribí",
  "escribe",
  "anotá",
  "anota",
  "decí",
  "di",
  "respirá",
  "respira",
  "tomá",
  "toma",
  "salí",
  "sal",
  "mandá",
  "manda",
  "poné",
  "pone",
  "apaga",
  "apagá",
  "cerrá",
  "cierra",
  "abre",
  "abrí",
];

function normalizeNewlines(input: string): string {
  return (input ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimAndCollapseSpaces(input: string): string {
  return input
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .trim();
}

function splitBlocks(input: string): string[] {
  const normalized = trimAndCollapseSpaces(normalizeNewlines(input));
  if (!normalized) return [];
  return normalized
    .split(/\n\s*\n+/g)
    .map((b) => b.trim())
    .filter(Boolean);
}

function lineCount(block: string): number {
  return block.split("\n").filter((l) => l.trim().length > 0).length;
}

function containsForbiddenDidactic(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_TERMS.filter((t) => lower.includes(t));
}

function hasConcreteAction(block: string): boolean {
  const lower = block.toLowerCase();
  return ACTION_HINTS.some((h) => lower.includes(h));
}

/**
 * Valida que el texto sea "TTS-ready" según reglas MIA:
 * - 5 bloques (apertura, central, trampa, acción, cierre)
 * - Ningún bloque > 5 líneas
 * - Debe existir al menos 1 acción concreta (ideal en bloque 4)
 * - Evitar didáctica (Jung/Freud/etc)
 */
export function validateTTSStructure(text: string, opts?: ValidateOptions): TTSValidationResult {
  const o = { ...DEFAULTS, ...(opts ?? {}) };
  const reasons: string[] = [];
  const blocks = splitBlocks(text);

  if (blocks.length === 0) {
    return { ok: false, reasons: ["Texto vacío o sin bloques detectables."], blocks: [] };
  }

  if (blocks.length < o.minBlocks) {
    reasons.push(`Faltan bloques: se detectaron ${blocks.length}, mínimo ${o.minBlocks}.`);
  }

  if (blocks.length !== o.expectedBlocks) {
    reasons.push(
      `Estructura incorrecta: se esperaban ${o.expectedBlocks} bloques y se detectaron ${blocks.length}.`
    );
  }

  blocks.forEach((b, i) => {
    const n = lineCount(b);
    if (n > o.maxLinesPerBlock) {
      reasons.push(`Bloque ${i + 1} demasiado largo: ${n} líneas (máximo ${o.maxLinesPerBlock}).`);
    }
    if (n === 0) reasons.push(`Bloque ${i + 1} vacío.`);
  });

  if (blocks.length >= 4) {
    const actionBlock = blocks[3];
    if (!hasConcreteAction(actionBlock)) {
      const anywhere = blocks.some((b) => hasConcreteAction(b));
      if (!anywhere) reasons.push("Falta una acción concreta (micro-acción).");
      else reasons.push("La acción concreta no está clara en el bloque de acción (bloque 4).");
    }
  } else {
    reasons.push("No hay suficiente estructura para validar acción (se requieren 4+ bloques).");
  }

  if (o.forbidDidacticTerms) {
    const found = containsForbiddenDidactic(text);
    if (found.length > 0) reasons.push(`Didáctica prohibida detectada: ${found.join(", ")}.`);
  }

  return { ok: reasons.length === 0, reasons, blocks };
}