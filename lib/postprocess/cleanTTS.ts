// lib/postprocess/cleanTTS.ts

export type CleanTTSOptions = {
  expectedBlocks?: number; // default 5
  maxLinesPerBlock?: number; // default 5
  maxChars?: number; // default 1200 (por seguridad TTS)
  removeDidacticTerms?: boolean; // default true
};

export type CleanTTSResult = {
  text: string;
  blocks: string[];
  notes: string[]; // trazas humanas para debug (sin ser técnicas)
};

const DEFAULTS: Required<CleanTTSOptions> = {
  expectedBlocks: 5,
  maxLinesPerBlock: 5,
  maxChars: 1200,
  removeDidacticTerms: true,
};

const DIDACTIC_TERMS = [
  "jung",
  "freud",
  "chamánico",
  "chamanico",
  "chamanismo",
  "psicoanálisis",
  "psicoanalisis",
];

function normalizeNewlines(input: string): string {
  return (input ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function collapseExtraBlankLines(input: string): string {
  // deja máximo 1 línea en blanco entre bloques
  return input.replace(/\n\s*\n\s*\n+/g, "\n\n");
}

function trimLines(input: string): string {
  return input
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

function splitBlocks(input: string): string[] {
  const base = trimLines(collapseExtraBlankLines(normalizeNewlines(input)));
  if (!base) return [];
  return base
    .split(/\n\s*\n+/g)
    .map((b) => b.trim())
    .filter(Boolean);
}

function joinBlocks(blocks: string[]): string {
  return blocks.map((b) => b.trim()).filter(Boolean).join("\n\n").trim();
}

function limitBlockLines(block: string, maxLines: number): { block: string; trimmed: boolean } {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= maxLines) return { block: lines.join("\n").trim(), trimmed: false };

  const cut = lines.slice(0, maxLines).join("\n").trim();
  return { block: cut, trimmed: true };
}

function scrubDidactic(text: string): { text: string; removed: string[] } {
  const lower = text.toLowerCase();
  const found = DIDACTIC_TERMS.filter((t) => lower.includes(t));
  if (found.length === 0) return { text, removed: [] };

  let out = text;
  for (const term of found) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "");
  }

  out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return { text: out.trim(), removed: found };
}

function ensureBlockCount(blocks: string[], expected: number): { blocks: string[]; note?: string } {
  if (blocks.length === expected) return { blocks };

  if (blocks.length > expected) {
    const head = blocks.slice(0, expected - 1);
    const tail = blocks.slice(expected - 1).join("\n");
    return { blocks: [...head, tail.trim()], note: `Se unieron bloques extra para quedar en ${expected}.` };
  }

  const out = [...blocks];
  while (out.length < expected) out.push("");
  return { blocks: out, note: `Se completaron bloques faltantes para llegar a ${expected}.` };
}

function enforceMaxChars(text: string, maxChars: number): { text: string; trimmed: boolean } {
  if (text.length <= maxChars) return { text, trimmed: false };
  const cut = text.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
  return { text: cut, trimmed: true };
}

export function cleanTTS(text: string, opts?: CleanTTSOptions): CleanTTSResult {
  const o = { ...DEFAULTS, ...(opts ?? {}) };
  const notes: string[] = [];

  let working = trimLines(collapseExtraBlankLines(normalizeNewlines(text)));

  if (o.removeDidacticTerms) {
    const scrub = scrubDidactic(working);
    working = scrub.text;
    if (scrub.removed.length > 0) notes.push(`Se limpiaron términos didácticos: ${scrub.removed.join(", ")}.`);
  }

  let blocks = splitBlocks(working);
  const ensured = ensureBlockCount(blocks, o.expectedBlocks);
  blocks = ensured.blocks;
  if (ensured.note) notes.push(ensured.note);

  const limited: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const { block: b2, trimmed } = limitBlockLines(blocks[i], o.maxLinesPerBlock);
    limited.push(b2);
    if (trimmed) notes.push(`Se recortó el bloque ${i + 1} a máximo ${o.maxLinesPerBlock} líneas.`);
  }

  let out = joinBlocks(limited);

  const char = enforceMaxChars(out, o.maxChars);
  out = char.text;
  if (char.trimmed) notes.push(`Se recortó el texto total a ${o.maxChars} caracteres (seguridad TTS).`);

  out = trimLines(collapseExtraBlankLines(out));

  return { text: out, blocks: splitBlocks(out), notes };
}