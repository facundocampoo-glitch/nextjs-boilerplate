// app/api/mia/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Memoria
import { MemoryEngine } from "../../../mia-memory/memory-engine";
// Selector de ocurrencias
import { pickOccurrences } from "../../../mia-memory/occurrence-selector";

type Manifest = {
  content_type: string;
  base_system: string[];
  features?: Record<string, unknown>;
};

function normalizeContentType(ct: string): string {
  return (ct || "").trim().toLowerCase().replace(/-/g, "_");
}

function isPromptFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower === "manifest.json") return false;
  if (lower === ".keep") return false;
  return lower.endsWith(".txt") || lower.endsWith(".md");
}

function sortStable(a: string, b: string) {
  return a.localeCompare(b, "en");
}

async function listPromptFiles(dirAbs: string): Promise<string[]> {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && isPromptFile(e.name))
    .map((e) => path.join(dirAbs, e.name))
    .sort(sortStable);
}

async function readTextFile(fileAbs: string): Promise<string> {
  return fs.readFile(fileAbs, "utf8");
}

async function findAllManifests(
  contentRootAbs: string
): Promise<Array<{ dirAbs: string; manifestAbs: string; manifest: Manifest }>> {
  const results: Array<{ dirAbs: string; manifestAbs: string; manifest: Manifest }> = [];

  async function walk(dirAbs: string) {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dirAbs, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name === "manifest.json") {
        try {
          const raw = await fs.readFile(full, "utf8");
          const parsed = JSON.parse(raw) as Manifest;
          if (!parsed?.content_type || !Array.isArray(parsed?.base_system)) continue;
          results.push({ dirAbs: path.dirname(full), manifestAbs: full, manifest: parsed });
        } catch {}
      }
    }
  }

  await walk(contentRootAbs);
  return results;
}

function dedupByBasenameKeepFirst(filesAbs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of filesAbs) {
    const base = path.basename(f);
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(f);
  }
  return out;
}

function buildSystemBundle(parts: Array<{ title: string; text: string }>): string {
  return parts.map((p) => `\n\n---\n# ${p.title}\n---\n${p.text}\n`).join("\n");
}

// OpenAI estable
async function openaiChat(systemText: string, userText: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userText },
      ],
      temperature: 0.9,
      top_p: 0.9,
      max_tokens: 800,
      frequency_penalty: 0.4,
      presence_penalty: 0.4,
    }),
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${res.statusText} ${txt}`.trim());
  }

  const data = await res.json() as any;
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("OpenAI returned empty content");
  }

  return content.trim();
}

function buildMemoryBlock(userId: string, contentType: string, avoid: string[]) {
  const avoidLine = avoid.length ? avoid.join(", ") : "none";

  return `[MIA_MEMORY]
user_id: ${userId}
current_content_type: ${contentType}
avoid_repeating_30d: ${avoidLine}
[/MIA_MEMORY]`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = typeof body?.input === "string" ? body.input : "";
    const contentTypeRaw = typeof body?.contentType === "string" ? body.contentType : "";
    const debug = Boolean(body?.debug);

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : "anonymous";

    const contentType = normalizeContentType(contentTypeRaw);

    const rootAbs = process.cwd();
    const promptsAbs = path.join(rootAbs, "prompts");
    const contentAbs = path.join(promptsAbs, "content");

    const manifests = await findAllManifests(contentAbs);

    const match = manifests.find(
      (m) => normalizeContentType(m.manifest.content_type) === contentType
    );

    if (!match) {
      return NextResponse.json(
        { error: `Unknown contentType: ${contentType}` },
        { status: 400 }
      );
    }

    const manifest = match.manifest;

    const baseSystemDirsAbs = (manifest.base_system || []).map((rel) =>
      path.join(promptsAbs, rel)
    );

    const baseSystemFilesAbsNested: string[] = [];
    for (const dirAbs of baseSystemDirsAbs) {
      const files = await listPromptFiles(dirAbs);
      baseSystemFilesAbsNested.push(...files);
    }

    const baseSystemFilesAbs = dedupByBasenameKeepFirst(baseSystemFilesAbsNested);

    const itemDirAbs = match.dirAbs;
    const itemFilesAbs = await listPromptFiles(itemDirAbs);

    const systemParts: Array<{ title: string; text: string }> = [];

    for (const f of baseSystemFilesAbs) {
      systemParts.push({
        title: path.relative(promptsAbs, f),
        text: await readTextFile(f),
      });
    }

    for (const f of itemFilesAbs) {
      systemParts.push({
        title: path.relative(promptsAbs, f),
        text: await readTextFile(f),
      });
    }

    const systemText = buildSystemBundle(systemParts);

    // MEMORIA
    const memory = new MemoryEngine(userId, { window_days: 30 });
    await memory.load();

    const avoid = memory.getRecentMechanismHits(30).map((h) => h.key).slice(0, 3);

    const memoryBlock = buildMemoryBlock(userId, contentType, avoid);

    // OCURRENCIAS
    const occurrences = await pickOccurrences({ count: 5 });

    const occurrenceBlock =
`[MIA_OCCURRENCES]
${occurrences.join("\n")}
[/MIA_OCCURRENCES]`;

    const userText =
`${memoryBlock}

${occurrenceBlock}

[USER:${userId}]
${input}`;

    const content = await openaiChat(systemText, userText);

    memory.addSession({
      content_type: contentType,
      item_key: contentType,
      meta: {
        input_length: input.length,
        output_length: content.length,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
    });

    memory.markMechanismUsed(contentType);
    memory.markOccurrenceUsed(contentType);

    await memory.save();

    return NextResponse.json({
      content,
      contentType,
      ...(debug
        ? {
            debug: {
              occurrencesInjected: occurrences,
            },
          }
        : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}