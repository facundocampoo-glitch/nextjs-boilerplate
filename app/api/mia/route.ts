import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
        } catch {
          // ignore invalid manifest
        }
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

/**
 * INTERNAL TTS CALL
 * In this repo the endpoint is /api/tts (NOT /api/generate-tts).
 */
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = typeof body?.input === "string" ? body.input : "";
    const contentTypeRaw = typeof body?.contentType === "string" ? body.contentType : "";
    const debug = Boolean(body?.debug);
    const tts = Boolean(body?.tts);

    const contentType = normalizeContentType(contentTypeRaw);
    if (!contentType) {
      return NextResponse.json({ error: "Missing contentType" }, { status: 400 });
    }

    // Base paths
    const rootAbs = process.cwd();
    const promptsAbs = path.join(rootAbs, "prompts");
    const contentAbs = path.join(promptsAbs, "content");

    // Find matching manifest by normalized content_type
    const manifests = await findAllManifests(contentAbs);
    const available = Array.from(
      new Set(manifests.map((m) => normalizeContentType(m.manifest.content_type)))
    ).sort(sortStable);

    const match = manifests.find(
      (m) => normalizeContentType(m.manifest.content_type) === contentType
    );

    if (!match) {
      return NextResponse.json(
        { error: `Unknown contentType: ${contentType}`, available },
        { status: 400 }
      );
    }

    const manifest = match.manifest;

    // Load base_system (declared order)
    const baseSystemDirsAbs = (manifest.base_system || []).map((rel) => path.join(promptsAbs, rel));
    const baseSystemFilesAbsNested: string[] = [];
    for (const dirAbs of baseSystemDirsAbs) {
      const files = await listPromptFiles(dirAbs);
      baseSystemFilesAbsNested.push(...files);
    }

    // Runtime dedup by filename (no manifest mutation)
    const baseSystemFilesAbs = dedupByBasenameKeepFirst(baseSystemFilesAbsNested);

    // Load item prompts
    const itemDirAbs = match.dirAbs;
    const itemFilesAbs = (await listPromptFiles(itemDirAbs)).sort(sortStable);

    // Build system bundle
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
    const userText = input || "";

    // Generate content
    const content = await openaiChat(systemText, userText);

    const debugPayload: DebugPayload = {
      manifest: {
        ...manifest,
        content_type: normalizeContentType(manifest.content_type),
      },
      loaded: {
        base_system_dirs: baseSystemDirsAbs.map((d) =>
          path.relative(rootAbs, d).replaceAll("\\", "/")
        ),
        base_system_files: baseSystemFilesAbs.map((f) =>
          path.relative(rootAbs, f).replaceAll("\\", "/")
        ),
        item_dir: path.relative(rootAbs, itemDirAbs).replaceAll("\\", "/"),
        item_files: itemFilesAbs.map((f) => path.relative(rootAbs, f).replaceAll("\\", "/")),
      },
    };

    // Optional: TTS (internal base URL)
    let audioBase64: string | undefined;
    if (tts) {
      const baseUrl = process.env.MIA_INTERNAL_BASE_URL || "http://localhost:3000";
      audioBase64 = await generateTtsBase64(baseUrl, content);
    }

    return NextResponse.json({
      content,
      contentType,
      ...(tts ? { audioBase64 } : {}),
      ...(debug ? { debug: debugPayload } : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}