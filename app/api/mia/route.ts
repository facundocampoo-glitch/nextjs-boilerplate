import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const TIMEZONE = "America/Argentina/Buenos_Aires"

function getBasePrompt() {
  const basePath = path.join(process.cwd(), "prompts", "mia-core", "conciencia-madre")

  const files = [
    "PROMPT_RAIZ.txt",
    "ACUERDO_OPERATIVO.txt",
    "MANIFIESTO.txt",
    "ANTI_REPETICION_MIA.md",
    "BANCO_OCURRENCIAS_MIA_1000.txt",
  ]

  return files
    .map((file) => {
      const filePath = path.join(basePath, file)
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
    })
    .filter(Boolean)
    .join("\n\n")
}

function buildSystemPrompt(contentType: string) {
  const base = getBasePrompt()

  if (contentType === "tarot_mensual") {
    return `
${base}

=== TAROT MENSUAL ===

Generar exactamente 10 cartas.

1. Carta central
2. Cruz izquierda
3. Cruz derecha
4. Cruz superior
5. Cruz inferior
6.
7.
8.
9.
10.

Reglas:
- Numerar 1-10
- Nombrar cada carta
- No narrativa libre
- No conclusión
`
  }

  return base
}

function resolveContentType(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
  )

  const day = now.getDay()
  const date = now.getDate()

  if (day === 0) {
    const isMonthly = date <= 3 || date >= 28
    return isMonthly ? "tarot_mensual" : "tarot_semanal"
  }

  return "horoscopo_diario"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const prompt = body.prompt ?? body.input
    const contentType = body.contentType ?? resolveContentType()

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const endpoint = process.env.OPENAI_ENDPOINT
    const apiKey = process.env.OPENAI_API_KEY

    const systemPrompt = buildSystemPrompt(contentType)

    const upstream = await fetch(endpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    })

    const data = await upstream.json()

    return NextResponse.json({
      content: data?.choices?.[0]?.message?.content || "",
      contentType,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err?.message },
      { status: 500 }
    )
  }
}