import fs from "fs/promises";
import path from "path";

type PickOptions = {
  userId?: string;
  count?: number;
};

async function loadUsedMechanisms(userId: string): Promise<Set<string>> {
  try {
    const root = process.cwd();

    const file = path.join(
      root,
      "mia-memory",
      "user_memory",
      userId,
      "mechanisms_used.json"
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

export async function pickMechanisms(opts: PickOptions = {}): Promise<string[]> {
  const count = opts.count ?? 3;
  const userId = opts.userId ?? "anonymous";

  const root = process.cwd();

  const fileAbs = path.join(
    root,
    "prompts",
    "mia-core",
    "conciencia-madre",
    "BANCO_MECANISMOS_MIA_300.txt"
  );

  const raw = await fs.readFile(fileAbs, "utf8");

  const all = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 6);

  const used = await loadUsedMechanisms(userId);

  const available = all.filter((m) => !used.has(m));

  const pool = available.length > count ? available : all;

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
