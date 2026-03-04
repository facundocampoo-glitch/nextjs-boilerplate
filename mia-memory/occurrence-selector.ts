import fs from "fs/promises";
import path from "path";

export async function pickOccurrences(count = 5) {
  const root = process.cwd();

  const file = path.join(
    root,
    "prompts/mia-core/conciencia-madre/BANCO_OCURRENCIAS_MIA_1000.txt"
  );

  const raw = await fs.readFile(file, "utf8");

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const shuffled = lines.sort(() => 0.5 - Math.random());

  return shuffled.slice(0, count);
}