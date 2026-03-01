import { NextResponse } from "next/server";
import { MIA_CONFIG } from "@/lib/mia/config";

export async function POST(req: Request) {
  const start = Date.now();
  let attempts = 1;

  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || prompt.length > MIA_CONFIG.LIMITS.MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: "Invalid prompt" },
        { status: 400 }
      );
    }

    // 👉 aquí va tu lógica actual de generación GPT
    // NO modificar tu integración existente
    // Solo mantenerla dentro del try

    const result = await fetch(process.env.OPENAI_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await result.json();

    const totalMs = Date.now() - start;

    return NextResponse.json(
      { output: data.choices?.[0]?.message?.content ?? "" },
      {
        headers: {
          [MIA_CONFIG.HEADERS.ATTEMPTS]: String(attempts),
          [MIA_CONFIG.HEADERS.TOTAL_MS]: String(totalMs),
          [MIA_CONFIG.HEADERS.VALIDATION]: "true",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}