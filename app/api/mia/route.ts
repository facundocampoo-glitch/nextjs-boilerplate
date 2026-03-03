import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function readFile(p: string) {
  return fs.readFileSync(p, "utf8")
}

function normType(s: string) {
  // "horoscopo-diario" <-> "horoscopo_diario"
  return String(s || "").trim().toLowerCase().replace(/-/g, "_")
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

type ManifestV1 = {
  content_type: string
  base_system?: string[]
  files?: string[]
}

function loadManifestByContentType(contentType: string): { mf: ManifestV1; dir: string } | null {
  const wanted = normType(contentType)
  for (const mfPath of listManifests()) {
    try {
      const parsed = JSON.parse(readFile(mfPath)) as any
      const ct = parsed?.content_type
      if (typeof ct === "string" && normType(ct) === wanted) {
        return { mf: parsed as ManifestV1, dir: path.dirname(mfPath) }
      }
    } catch {
      // ignore broken json
    }
  }
  return null
}

function loadTextFilesFromDir(dir: string): { text: string; files: string[] } {
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
      const full = path.join(dir, f)
      const content = readFile(full).trim()
      return content ? `=== ${f} ===\n${content}` : ""
    })
    .filter(Boolean)
    .join("\n\n")

  return { text, files: files.map((f) => path.relative(process.cwd(), path.join(dir, f))) }
}

function loadBaseSystemFromManifest(mf: ManifestV1): { text: string; files: string[]; dirs: string[] } {
  const base = Array.isArray(mf.base_system) ? mf.base_system : []
  const allTexts: string[] = []
  const allFiles: string[] = []
  const usedDirs: string[] = []

  for (const rel of base) {
    const dir = path.join(process.cwd(), "prompts", rel)
    usedDirs.push(path.relative(process.cwd(), dir))
    const loaded = loadTextFilesFromDir(dir)
    if (loaded.text) allTexts.push(loaded.text)
    allFiles.push(...loaded.files)
  }

  return { text: allTexts.join("\n\n"), files: allFiles, dirs: usedDirs }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const input = body?.prompt ?? body?.input
    const contentType = body?.contentType
    const debug = Boolean(body?.debug)

    if (!input) return NextResponse.json({ error: "Missing input" }, { status: 400 })
    if (!contentType) return NextResponse.json({ error: "Missing contentType" }, { status: 400 })

    const endpoint = process.env.OPENAI_ENDPOINT
    const apiKey = process.env.OPENAI_API_KEY
    if (!endpoint || !apiKey) {
      return NextResponse.json(
        { error: "Missing env", missing: { OPENAI_ENDPOINT: !endpoint, OPENAI_API_KEY: !apiKey } },
        { status: 500 }
      )
    }

    const found = loadManifestByContentType(String(contentType))
    if (!found) {
      const available: string[] = []
      for (const mfPath of listManifests()) {
        try {
          const p = JSON.parse(readFile(mfPath)) as any
          if (typeof p?.content_type === "string") available.push(normType(p.content_type))
        } catch {}
      }
      available.sort((a, b) => a.localeCompare(b, "es"))
      return NextResponse.json(
        { error: "Unknown contentType (no manifest)", contentType: String(contentType), available },
        { status: 400 }
      )
    }

    const { mf } = found

    // Carga estricta de base_system (tu arquitectura real)
    const baseLoaded = loadBaseSystemFromManifest(mf)

    const systemPrompt = baseLoaded.text

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
          { role: "user", content: String(input) },
        ],
        temperature: 0.7,
      }),
    })

    const data = await upstream.json()

    const res: any = {
      content: data?.choices?.[0]?.message?.content ?? "",
      contentType: String(contentType),
    }

    if (debug) {
      res.debug = {
        manifest: {
          content_type: mf.content_type,
          base_system: mf.base_system ?? [],
        },
        loaded: {
          base_system_dirs: baseLoaded.dirs,
          base_system_files: baseLoaded.files,
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