import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function readFileSafe(p: string) {
  return fs.readFileSync(p, "utf8")
}

function listManifests(): string[] {
  const root = path.join(process.cwd(), "prompts", "content")
  const out: string[] = []

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.isFile() && e.name === "manifest.json") out.push(full)
    }
  }

  if (!fs.existsSync(root)) return []
  walk(root)
  return out
}

type Manifest = { contentType: string; files: string[] }

function loadManifestByContentType(contentType: string): { manifest: Manifest; dir: string } | null {
  const manifests = listManifests()

  for (const mfPath of manifests) {
    try {
      const raw = readFileSafe(mfPath)
      const parsed = JSON.parse(raw) as Manifest
      if (parsed?.contentType === contentType && Array.isArray(parsed.files)) {
        return { manifest: parsed, dir: path.dirname(mfPath) }
      }
    } catch {
      // ignore broken manifest
    }
  }
  return null
}

function loadConcienciaMadreAll(): { text: string; files: string[] } {
  const dir = path.join(process.cwd(), "prompts", "mia-core", "conciencia-madre")
  if (!fs.existsSync(dir)) return { text: "", files: [] }

  const entries = fs.readdirSync(dir)
  const files = entries
    .filter((name) => {
      const full = path.join(dir, name)
      if (!fs.existsSync(full)) return false
      const st = fs.statSync(full)
      if (!st.isFile()) return false
      const lower = name.toLowerCase()
      if (lower === ".keep") return false
      if (lower === "manifest.json") return false
      return lower.endsWith(".txt") || lower.endsWith(".md")
    })
    .sort((a, b) => a.localeCompare(b, "es"))

  const text = files
    .map((f) => {
      const content = readFileSafe(path.join(dir, f)).trim()
      return content ? `=== ${f} ===\n${content}` : ""
    })
    .filter(Boolean)
    .join("\n\n")

  return { text, files: files.map((f) => `prompts/mia-core/conciencia-madre/${f}`) }
}

function loadItemPromptFromManifest(contentType: string): { text: string; files: string[] } {
  const found = loadManifestByContentType(contentType)
  if (!found) return { text: "", files: [] }

  const { manifest, dir } = found
  const loadedFiles: string[] = []

  const text = manifest.files
    .map((rel) => {
      const full = path.join(dir, rel)
      const content = readFileSafe(full).trim()
      loadedFiles.push(path.relative(process.cwd(), full))
      return content ? `=== ${path.basename(rel)} ===\n${content}` : ""
    })
    .filter(Boolean)
    .join("\n\n")

  return { text, files: loadedFiles }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const prompt = body?.prompt ?? body?.input
    const contentType = body?.contentType
    const debug = Boolean(body?.debug)

    if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    if (!contentType) return NextResponse.json({ error: "Missing contentType" }, { status: 400 })

    const endpoint = process.env.OPENAI_ENDPOINT
    const apiKey = process.env.OPENAI_API_KEY
    if (!endpoint || !apiKey) {
      return NextResponse.json(
        {
          error: "Missing env",
          missing: { OPENAI_ENDPOINT: !endpoint, OPENAI_API_KEY: !apiKey },
        },
        { status: 500 }
      )
    }

    // 🔒 MODO ESTRICTO: si no existe manifest, NO inventamos nada.
    const itemFound = loadManifestByContentType(String(contentType))
    if (!itemFound) {
      // listado útil para que no haya “magia”
      const available: string[] = []
      for (const mf of listManifests()) {
        try {
          const parsed = JSON.parse(readFileSafe(mf)) as any
          if (typeof parsed?.contentType === "string") available.push(parsed.contentType)
        } catch {}
      }
      available.sort((a, b) => a.localeCompare(b, "es"))

      return NextResponse.json(
        { error: "Unknown contentType (no manifest)", contentType, available },
        { status: 400 }
      )
    }

    const madre = loadConcienciaMadreAll()
    const item = loadItemPromptFromManifest(String(contentType))

    const systemPrompt = [madre.text, item.text].filter(Boolean).join("\n\n")

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: String(prompt) },
        ],
        temperature: 0.7,
      }),
    })

    const data = await upstream.json()

    const res: any = {
      content: data?.choices?.[0]?.message?.content ?? "",
      contentType,
    }

    if (debug) {
      res.debug = {
        loaded: {
          concienciaMadreFiles: madre.files,
          itemFiles: item.files,
        },
      }
    }

    return NextResponse.json(res)
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}