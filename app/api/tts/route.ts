export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return Response.json({ ok: false, error: "Falta text" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      return Response.json(
        { ok: false, error: "Faltan ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID" },
        { status: 500 }
      );
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json(
        { ok: false, status: res.status, error: errText },
        { status: 500 }
      );
    }

    const audio = await res.arrayBuffer();

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}
