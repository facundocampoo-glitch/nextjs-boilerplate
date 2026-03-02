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
    .join("\n\n")
}

function buildSystemPrompt(contentType: string) {
  const base = getBasePrompt()

  // 🔮 ENFORCEMENT TAROT MENSUAL 5+5 EN CRUZ
  if (contentType === "tarot_mensual") {
    return `
${base}

=== INSTRUCCIÓN ESTRUCTURAL OBLIGATORIA ===

Debes generar exactamente 10 cartas.

Estructura obligatoria:

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

- Debes numerar del 1 al 10.
- Debes nombrar cada carta explícitamente.
- No puedes omitir posiciones.
- No puedes generar menos cartas.
- No puedes generar más cartas.
- No puedes responder en formato narrativo libre.
- No puedes hacer resumen general sin estructura.

El formato debe ser estrictamente estructurado.
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
    const isMonthly =
      date <= 3 || date >= 28

    return isMonthly ? "tarot_mensual" : "tarot_semanal"
  }

  return "horoscopo_diario"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const contentType = resolveContentType()
    const systemPrompt = buildSystemPrompt(contentType)

    const response = await fetch(process.env.OPENAI_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

    const data = await response.json()

    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || "",
      contentType,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}