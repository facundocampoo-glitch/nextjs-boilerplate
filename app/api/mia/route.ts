import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function readFileSafe(p: string) {
  try {
    return fs.readFileSync(p, "utf8")
  } catch {
    return ""
  }
}

function loadConcienciaMadre() {
  const base = path.join(process.cwd(), "prompts/mia-core/conciencia-madre")

  const files = [
    "PROMPT_RAIZ_CONCIENCIA_MADRE__MOTOR_MIA300.txt",
    "ACUERDO_OPERATIVO.txt",
    "MANIFIESTO_DE_VOZ_MIA.md",
    "ANTI_REPETICION_MIA.md",
    "BANCO_OCURRENCIAS_MIA_1000.txt",
  ]

  return files
    .map(f => readFileSafe(path.join(base, f)))
    .filter(Boolean)
    .join("\n\n")
}

function loadContentPrompt(contentType: string) {
  const map: Record<string,string> = {
    horoscopo_diario: "prompts/content/horoscopo-diario/PROMPT_HOROSCOPO_DIARIO_GENERADOR.txt",
    horoscopo_semanal: "prompts/content/horoscopo-semanal/PROMPT_HOROSCOPO_SEMANAL_GENERADOR.txt",
    tarot_marselles: "prompts/content/tarot-marselles/PROMPT_TAROT_MARSELLES_GENERADOR.txt"
  }

  const file = map[contentType]
  if (!file) return ""

  return readFileSafe(path.join(process.cwd(), file))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const prompt = body.prompt ?? body.input
    const contentType = body.contentType ?? "horoscopo_diario"

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const basePrompt = loadConcienciaMadre()
    const contentPrompt = loadContentPrompt(contentType)

    const systemPrompt = `
${basePrompt}

${contentPrompt}
`

    const response = await fetch(process.env.OPENAI_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    })

    const data = await response.json()

    return NextResponse.json({
      content: data?.choices?.[0]?.message?.content ?? "",
      contentType
    })

  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err?.message },
      { status: 500 }
    )
  }
}