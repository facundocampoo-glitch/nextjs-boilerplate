// Archivo: app/api/mia/route.ts
// Ruta completa: app/api/mia/route.ts (en el boilerplate)
// Qué hacer: REEMPLAZAR el archivo completo en GitHub

export const runtime = "nodejs";
export const maxDuration = 300;

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

const LOCALE_TO_LANGUAGE: Record<string, string> = {
  "es-AR": "Spanish (Argentine)",
  "ru-RU": "Russian",
  "en-US": "English (American)",
  "it-IT": "Italian",
  "pt-BR": "Portuguese (Brazilian)",
  "pt-PT": "Portuguese (European)",
  "de-DE": "German",
  "fr-FR": "French",
};

const LENGTH_MAP: Record<string, { min: number; max: number; maxTokens: number }> = {
  cuerpo_onirico:           { min: 5000,  max: 8000,  maxTokens: 10000 },
  cuerpo_psicomagico:       { min: 3500,  max: 5500,  maxTokens: 7000  },
  tarot_marselles:          { min: 9500,  max: 12500, maxTokens: 16000 },
  cuerpo_astral:            { min: 4200,  max: 6000,  maxTokens: 8000  },
  horoscopo_diario:         { min: 900,   max: 1400,  maxTokens: 3500  },
  horoscopo_semanal:        { min: 2800,  max: 3500,  maxTokens: 5500  },
  horoscopo_chino_diario:   { min: 900,   max: 1400,  maxTokens: 3500  },
  horoscopo_chino_semanal:  { min: 2800,  max: 3500,  maxTokens: 5500  },
  horoscopo_solar_diario:   { min: 900,   max: 1400,  maxTokens: 3500  },
  horoscopo_solar_semanal:  { min: 2800,  max: 3500,  maxTokens: 5500  },
};

const HOROSCOPO_TYPES = new Set([
  "horoscopo_diario",
  "horoscopo_semanal",
  "horoscopo_chino_diario",
  "horoscopo_chino_semanal",
  "horoscopo_solar_diario",
  "horoscopo_solar_semanal",
]);

const VOZ_PRIMERO = [
  "MANIFIESTO_DE_VOZ_MIA.md",
  "ARQ_TONO_FILOSO_MIA.md",
  "ARQ_TONO_HUMOR_IRONICO_MIA.md",
  "ARQ_LIMITES_HUMOR_MIA.md",
  "ARQ_FORMATO_AIRE_Y_CIERRES_MIA.md",
  "ANTI_REPETICION_MIA.md",
];

const MOTOR_DESPUES = [
  "ARQ_MOTOR_CARACTER_MIA.md",
  "ACUERDO_OPERATIVO.txt",
  "PROMPT_RAIZ_CONCIENCIA_MADRE__MOTOR_MIA300.txt",
];

function normalizeContentType(ct: string): string {
  return (ct || "").trim().toLowerCase().replace(/-/g, "_");
}

function buildLengthBlock(contentType: string): string {
  const range = LENGTH_MAP[contentType];

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
- situation
- tension
- hidden pattern
- consequence
- closing insight

Stay inside the target range.

[/MIA_LENGTH]`;
}

function buildOpeningBlock(contentType: string): string {
  if (!HOROSCOPO_TYPES.has(contentType)) return "";

  return `\n[MIA_OPENING_HARD_RULE]

ABSOLUTE OPENING RULE — VIOLATING THIS RULE INVALIDATES THE READING:

The user's name is given in the input under "Nombre:".

The very first line of the reading MUST start with the user's name. Examples of correct openings:
- "Facu,"
- "Florencia."
- "Hola Facu,"
- "Facu — hoy"

FORBIDDEN OPENINGS (DO NOT WRITE THESE — UNDER ANY CIRCUMSTANCE):
- Zodiac sign in capital letters at the beginning (e.g. "LIBRA — HOY", "ARIES.", "PISCIS —")
- Chinese animal in capital letters at the beginning (e.g. "MONO — HOY", "DRAGÓN.")
- Any uppercase astrological label as the first word
- Date as the first line
- Any header, title, or label before the user's name

The zodiac sign and Chinese animal can be mentioned naturally inside the body, but NEVER as the opening line.

If you find yourself writing a sign name in caps at the start, STOP and rewrite the opening using the user's name instead.

[/MIA_OPENING_HARD_RULE]`;
}

async function openaiChat(systemText: string, userText: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: maxTokens,
      input: [
        { role: "system", content: systemText },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const data = await res.json();

  const outputBlock = data?.output?.find((b: any) => b.role === "assistant" || b.type === "message");
  const content = outputBlock?.content?.find((c: any) => c.type === "output_text" || c.type === "text")?.text
    ?? outputBlock?.content?.[0]?.text;

  if (!content) throw new Error("OpenAI returned empty content");

  return content.trim();
}

async function loadConcienciaMadre(): Promise<string> {
  try {
    const rootAbs = process.cwd();
    const concienciaDir = path.join(rootAbs, "prompts", "mia-core", "conciencia-madre");

    let text = "";

    for (const file of VOZ_PRIMERO) {
      try {
        const content = await fs.readFile(path.join(concienciaDir, file), "utf8");
        text += `\n\n${content}`;
      } catch {}
    }

    for (const file of MOTOR_DESPUES) {
      try {
        const content = await fs.readFile(path.join(concienciaDir, file), "utf8");
        text += `\n\n${content}`;
      } catch {}
    }

    return text;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = typeof body?.input === "string" ? body.input : "";
    const contentTypeRaw = typeof body?.contentType === "string" ? body.contentType : "";
    const userId = body?.userId || "anonymous";
    const locale = typeof body?.locale === "string" ? body.locale : "es-AR";

    const contentType = normalizeContentType(contentTypeRaw);
    const language = LOCALE_TO_LANGUAGE[locale] || "Spanish (Argentine)";
    const maxTokens = LENGTH_MAP[contentType]?.maxTokens ?? 8000;

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

    const concienciaMadre = await loadConcienciaMadre();

    const files = await fs.readdir(manifestDir);
    let contentTypeText = "";
    for (const file of files) {
      if (file.endsWith(".txt") || file.endsWith(".md")) {
        const txt = await fs.readFile(path.join(manifestDir, file), "utf8");
        contentTypeText += `\n\n${txt}`;
      }
    }

    let systemText = concienciaMadre + contentTypeText;

    systemText += `\n\n[MIA_LANGUAGE]\nYou MUST write your entire response in ${language}. Do not use any other language. The user's interface is in ${language} and they expect the reading in ${language}.\n[/MIA_LANGUAGE]`;

    const memory = new MemoryEngine(userId);
    await memory.load();

    const mechanisms = await pickMechanisms({ userId, count: 3 });
    const occurrences = await pickOccurrences({ userId, count: 5 });

    const lengthBlock = buildLengthBlock(contentType);
    const openingBlock = buildOpeningBlock(contentType);

    const userText = `
${lengthBlock}
${openingBlock}

[MIA_MECHANISMS]
${mechanisms.join("\n")}
[/MIA_MECHANISMS]

[MIA_OCCURRENCES]
${occurrences.join("\n")}
[/MIA_OCCURRENCES]

${input}
`;

    const content = await openaiChat(systemText, userText, maxTokens);

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
