// lib/mia/core/tts.ts

export async function synthesizeSpeech(
  voiceId: string,
  text: string,
  signal: AbortSignal
) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
      signal,
    }
  );

  return res;
}