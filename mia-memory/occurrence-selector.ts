import fs from "fs/promises";
import path from "path";

type PickOptions = {
  userId?: string;
  count?: number;
  minLen?: number;
};

async function loadUserUsedOccurrences(userId: string): Promise<Set<string>> {
  try {
    const root = process.cwd();

    const file = path.join(
      root,
      "mia-memory",
      "user_memory",
      userId,
      "occurrences_used.json"
    );

    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);

    const used = new Set<string>();

    for (const key of Object.keys(data)) {
      used.add(key);
    }

    return used;
  } catch {
    return new Set();
  }
}

export async function pickOccurrences(opts: PickOptions = {}): Promise<string[]> {
  const count = opts.count ?? 5;
  const minLen = opts.minLen ?? 6;
  const userId = opts.userId ?? "anonymous";

  const root = process.cwd();

  const fileAbs = path.join(
    root,
    "prompts",
    "mia-core",
    "conciencia-madre",
    "BANCO_OCURRENCIAS_MIA_1000.txt"
  );

  const raw = await fs.readFile(fileAbs, "utf8");

  const allLines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= minLen);

  const used = await loadUserUsedOccurrences(userId);

  const available = allLines.filter((l) => !used.has(l));

  const pool = available.length > count ? available : allLines;

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}