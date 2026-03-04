// app/api/mia/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// ✅ Memoria evolutiva (inyectada en userText)
import { MemoryEngine } from "../../../mia-memory/memory-engine";

type Manifest = {
  content_type: string;
  base_system: string[];
  features?: Record<string, unknown>;
};

type LoadedDebug = {
  base_system_dirs: string[];
  base_system_files: string[];
  item_dir: string;
  item_files: string[];
};

type DebugPayload = {
  manifest: Manifest;
  loaded: LoadedDebug;
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

function itemPriority(fileAbs: string): number {
  const b = path.basename(fileAbs).toLowerCase();

  if (b.includes("acuerdo_operativo")) return 10;
  if (b.includes("manifiesto")) return 20;
  if (b.includes("prompt_raiz")) return 30;
  if (b.includes("checklist")) return 40;
  if (b.includes("validacion")) return 50;
  if (b.includes("ui_") || b.includes("pregunta")) return 60;
  if (b.includes("estructura")) return 70;
  if (b.includes("demo")) return 80;
  if (b.includes("generador")) return 90;

  return 75;
}

function sortItemFiles(filesAbs: string[]): string[] {
  return [...filesAbs].sort((a, b) => {
    const pa = itemPriority(a);
    const pb = itemPriority(b);
    if (pa !== pb) return pa - pb;
    return sortStable(a, b);
  });
}

async function openaiChat(systemText: string, userText: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
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
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${res.statusText} ${txt}`.trim());
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content");
  }

  return content.trim();
}

async function generateTtsBase64(baseUrl: string, text: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`TTS error: ${res.status} ${res.statusText} ${txt}`.trim());
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

function buildMemoryBlock(args: {
  userId: string;
  contentType: string;
  recentMechanismHits: Array<{ key: string; used_count: number; days_ago: number }>;
  recentOccurrenceHits: Array<{ key: string; used_count: number; days_ago: number }>;
}): string {
  const topM = args.recentMechanismHits.slice(0, 8);
  const topO = args.recentOccurrenceHits.slice(0, 8);

  const mechLine =
    topM.length === 0
      ? "none"
      : topM.map((h) => `${h.key}(${h.used_count},${h.days_ago}d)`).join(", ");

  const occLine =
    topO.length === 0
      ? "none"
      : topO.map((h) => `${h.key}(${h.used_count},${h.days_ago}d)`).join(", ");

  const avoid = topM.slice(0, 3).map((h) => h.key);
  const avoidLine = avoid.length ? avoid.join(", ") : "none";

  return `[MIA_MEMORY]
user_id: ${args.userId}
current_content_type: ${args.contentType}
recent_mechanisms_30d: ${mechLine}
recent_occurrences_30d: ${occLine}
avoid_repeating_30d: ${avoidLine}
instruction: Use this memory to reduce repetition and vary structure/imagery while keeping the requested content_type.
[/MIA_MEMORY]`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = typeof body?.input === "string" ? body.input : "";
    const contentTypeRaw = typeof body?.contentType === "string" ? body.contentType : "";
    const debug = Boolean(body?.debug);
    const tts = Boolean(body?.tts);

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : "anonymous";

    const contentType = normalizeContentType(contentTypeRaw);
    if (!contentType) {
      return NextResponse.json({ error: "Missing contentType" }, { status: 400 });
    }

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
    const itemFilesAbs = sortItemFiles(await listPromptFiles(itemDirAbs));

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

    // ✅ MEMORIA: se carga ANTES de OpenAI para inyectar en userText
    const memory = new MemoryEngine(userId, { window_days: 30 });
    await memory.load();

    const recentMechanismHits30 = memory.getRecentMechanismHits(30);
    const recentOccurrenceHits30 = memory.getRecentOccurrenceHits(30);

    const memoryBlock = buildMemoryBlock({
      userId,
      contentType,
      recentMechanismHits: recentMechanismHits30.map((h) => ({
        key: h.key,
        used_count: h.used_count,
        days_ago: h.days_ago,
      })),
      recentOccurrenceHits: recentOccurrenceHits30.map((h) => ({
        key: h.key,
        used_count: h.used_count,
        days_ago: h.days_ago,
      })),
    });

    const baseUserText = userId === "anonymous" ? input : `[USER:${userId}]\n${input}`;
    const userText = `${memoryBlock}\n\n${baseUserText}`;

    const content = await openaiChat(systemText, userText);

    let audioBase64: string | undefined;

    if (tts) {
      const baseUrl = process.env.MIA_INTERNAL_BASE_URL || "http://localhost:3000";
      audioBase64 = await generateTtsBase64(baseUrl, content);
    }

    // ✅ MEMORIA: registrar sesión + uso, y persistir
    memory.addSession({
      content_type: contentType,
      item_key: contentType,
      meta: {
        input_length: input.length,
        output_length: content.length,
        tts,
        debug,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
    });

    // v1 simple: contentType como key estable
    memory.markMechanismUsed(contentType);
    memory.markOccurrenceUsed(contentType);

    await memory.save();

    return NextResponse.json({
      content,
      contentType,
      ...(tts ? { audioBase64 } : {}),
      ...(debug
        ? {
            debug: {
              userId,
              item_files: itemFilesAbs.map((f) =>
                path.relative(rootAbs, f).replaceAll("\\", "/")
              ),
              memorySignals: {
                recentMechanismHits30,
                recentOccurrenceHits30,
              },
            },
          }
        : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}