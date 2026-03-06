import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { MemoryEngine } from "../../../mia-memory/memory-engine";
import { pickOccurrences } from "../../../mia-memory/occurrence-selector";
import { pickMechanisms } from "../../../mia-memory/mechanism-selector";

type Manifest = {
  content_type: string;
  base_system: string[];
  features?: Record<string, unknown>;
};

type ProfileTraits = {
  updated_at: string;
  traits: Record<string, any>;
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

function buildLengthBlock(contentType: string) {
  return `[MIA_LENGTH]

Respect production length ranges defined in ACUERDO_OPERATIVO.txt.

Do not shorten the reading.
Do not summarize.
Aim for the full production range unless explicitly impossible.

If the system runs out of space, prioritize clarity but continue until the range is reached.

Current content type: ${contentType}

[/MIA_LENGTH]`;
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
      top_p: 0.9,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = typeof body?.input === "string" ? body.input : "";
    const contentTypeRaw = typeof body?.contentType === "string" ? body.contentType : "";

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : "anonymous";

    const contentType = normalizeContentType(contentTypeRaw);
    if (!contentType) {
      return NextResponse.json({ error: "Missing contentType" }, { status: 400 });
    }

    const readingId = crypto.randomUUID();

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

    const memory = new MemoryEngine(userId, { window_days: 30 });
    await memory.load();

    const mechanisms = await pickMechanisms({ userId, count: 3 });
    const occurrences = await pickOccurrences({ userId, count: 5, minLen: 6 });

    const lengthBlock = buildLengthBlock(contentType);

    const userText =
      `${lengthBlock}\n\n` +
      `[USER:${userId}]\n${input}`;

    const content = await openaiChat(systemText, userText);

    memory.addSession({
      content_type: contentType,
      item_key: contentType,
      meta: {
        reading_id: readingId,
        input_length: input.length,
        output_length: content.length,
      },
    });

    await memory.save();

    return NextResponse.json({
      readingId,
      content,
      contentType,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}