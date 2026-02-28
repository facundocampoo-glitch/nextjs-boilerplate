import { normalizeLocale, pickVoiceId } from "./voice-map";

export async function elevenTtsToBase64(args: {
  text: string;
  locale?: string;
  voice_id?: string;
  stability?: number;
  similarity?: number;
  apiKey: string;
}) {
  const text = (args.text || "").trim();
  if (!text) throw new Error("Falta text");

  const locale = (args.locale || "").trim();
  const voice_id = pickVoiceId(locale, args.voice_id);

  const stability = typeof args.stability === "number" ? args.stability : 0.55;
  const similarity = typeof args.similarity === "number" ? args.similarity : 0.85;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": args.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost: similarity,
      },
    }),
  });

  if (!r.ok) {
    const details = await r.text().catch(() => "");
    const msg = `ElevenLabs error ${r.status}: ${details.slice(0, 400)}`;
    throw new Error(msg);
  }

  const arrayBuffer = await r.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    audio_base64: base64,
    voice_id_used: voice_id,
    locale_normalized: normalizeLocale(locale),
  };
}