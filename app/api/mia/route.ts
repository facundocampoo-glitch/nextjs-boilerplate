export const runtime = "nodejs";
export const maxDuration = 60;

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
};

function normalizeContentType(ct: string): string {
  return (ct || "").trim().toLowerCase().replace(/-/g, "_");
}

function buildLengthBlock(contentType: string) {
  const map: Record<string, { min: number; max: number }> = {
    cuerpo_onirico: { min: 5000, max: 8000 },
    cuerpo_psicomagico: { min: 3500, max: 5500 },
    tarot_marselles: { min: 9500, max: 12500 },
    cuerpo_astral: { min: 4200, max: 6000 },
    horoscopo_diario: { min: 900, max: 1400 },
    horoscopo_semanal: { min: 2800, max: 3500 },
  };

  const range = map[contentType];

  if (!range) {
    return `[MIA_LENGTH]
Produce a full narrative reading.
Avoid short answers.
[/MIA_LENGTH]`;
  }

  return `[MIA_LENGTH]

Target length: ${range.min}–${range.max} characters.

Do not summarize.
Do not stop early.

Explore layers before closing:
• situation
• tension
• hidden pattern
• consequence
• closing insight

Stay inside the target range.

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
      max_tokens: 2000
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) throw new Error("OpenAI returned empty content");

  return content.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = typeof body?.input === "string" ? body.input : "";
    const contentTypeRaw = typeof body?.contentType === "string" ? body.contentType : "";
    const userId = body?.userId || "anonymous";

    const contentType = normalizeContentType(contentTypeRaw);

    const readingId = crypto.randomUUID();

    const rootAbs = process.cwd();
    const promptsAbs = path.join(rootAbs, "prompts");
    const contentAbs = path.join(promptsAbs, "content");

    const dirs = await fs.readdir(contentAbs);

    let manifestDir: string | null = null;

    for (const dir of dirs) {
      const manifestPath = path.join(contentAbs, dir, "manifest.json");
      try {
        const raw = await fs.readFile(manifestPath, "utf8");
        const parsed = JSON.parse(raw) as Manifest;

        if (normalizeContentType(parsed.content_type) === contentType) {
          manifestDir = path.join(contentAbs, dir);
          break;
        }
      } catch {}
    }

    if (!manifestDir) {
      return NextResponse.json(
        { error: `Unknown contentType: ${contentType}` },
        { status: 400 }
      );
    }

    const files = await fs.readdir(manifestDir);

    let systemText = "";

    for (const file of files) {
      if (file.endsWith(".txt") || file.endsWith(".md")) {
        const txt = await fs.readFile(path.join(manifestDir, file), "utf8");
        systemText += `\n\n${txt}`;
      }
    }

    const memory = new MemoryEngine(userId);
    await memory.load();

    const mechanisms = await pickMechanisms({ userId, count: 3 });
    const occurrences = await pickOccurrences({ userId, count: 5 });

    const lengthBlock = buildLengthBlock(contentType);

    const userText = `
${lengthBlock}

[MIA_MECHANISMS]
${mechanisms.join("\n")}
[/MIA_MECHANISMS]

[MIA_OCCURRENCES]
${occurrences.join("\n")}
[/MIA_OCCURRENCES]

${input}
`;

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
