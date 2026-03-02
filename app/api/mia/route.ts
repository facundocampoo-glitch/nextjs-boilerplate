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

=== INSTRUCCIÓN ESTRUCTURAL OBLIGATORIA ===

Debes generar exactamente 10 cartas.

Cruz central (5 cartas):
1. Carta 1 - Posición central
2. Carta 2 - Cruz izquierda
3. Carta 3 - Cruz derecha
4. Carta 4 - Cruz superior
5. Carta 5 - Cruz inferior

Columna de proyección (5 cartas):
6. Carta 6
7. Carta 7
8. Carta 8
9. Carta 9
10. Carta 10

Reglas obligatorias:
- Numerar del 1 al 10.
- Nombrar cada carta explícitamente.
- No omitir posiciones.
- No menos de 10 cartas.
- No más de 10 cartas.
- Prohibido formato narrativo libre.
- Prohibido resumen general sin estructura.

Formato estrictamente estructurado.
`
  }

  return base
}

function resolveContentType(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }))
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
    const body = await req.json().catch(() => null)
    const prompt = body?.prompt

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const endpoint = process.env.OPENAI_ENDPOINT
    const apiKey = process.env.OPENAI_API_KEY

    if (!endpoint || !apiKey) {
      return NextResponse.json(
        {
          error: "Missing env",
          missing: {
            OPENAI_ENDPOINT: !endpoint,
            OPENAI_API_KEY: !apiKey,
          },
        },
        { status: 500 }
      )
    }

    const contentType = resolveContentType()
    const systemPrompt = buildSystemPrompt(contentType)

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
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    })

    const text = await upstream.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Upstream error",
          status: upstream.status,
          statusText: upstream.statusText,
          details: data,
        },
        { status: 500 }
      )
    }

    const content = data?.choices?.[0]?.message?.content ?? ""

    return NextResponse.json({
      content,
      contentType,
    })
  } catch (err: any) {
    const dev = process.env.NODE_ENV !== "production"
    return NextResponse.json(
      {
        error: "Internal Server Error",
        ...(dev
          ? {
              message: err?.message ?? String(err),
              stack: err?.stack ?? null,
            }
          : {}),
      },
      { status: 500 }
    )
  }
}