import fs from "fs/promises";
import path from "path";

type PickOptions = {
  count?: number; // cuántas ocurrencias devolver
  minLen?: number; // filtrar líneas muy cortas
  seedKey?: string; // opcional: para estabilizar por userId/contentType (fase siguiente)
};

/**
 * Lee el BANCO_OCURRENCIAS_MIA_1000 y devuelve N líneas "ocurrencias" listas para inyectar.
 * Por ahora: random simple (suficiente para variación inmediata).
 */
export async function pickOccurrences(opts: PickOptions = {}): Promise<string[]> {
  const count = Math.max(1, Math.min(12, opts.count ?? 5));
  const minLen = Math.max(1, opts.minLen ?? 6);

  const root = process.cwd();
  const fileAbs = path.join(
    root,
    "prompts",
    "mia-core",
    "conciencia-madre",
    "BANCO_OCURRENCIAS_MIA_1000.txt"
  );

  const raw = await fs.readFile(fileAbs, "utf8");

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= minLen);

  // shuffle simple
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }

  return lines.slice(0, Math.min(count, lines.length));
}
