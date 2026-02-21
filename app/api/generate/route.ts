export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt, content_type, user_profile } = await req.json();
    if (!prompt) {
      return Response.json(
        { ok: false, error: "Falta prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, error: "Falta OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return Response.json(
        { ok: false, error: err },
        { status: 500 }
      );
    }

    const data = await r.json();

    const text =
      data.output?.[0]?.content?.[0]?.text ||
      "No vino texto.";

    return Response.json({ ok: true, text });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
