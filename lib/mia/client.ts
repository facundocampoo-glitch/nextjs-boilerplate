// lib/mia/client.ts

type MiaTextResponse = {
  output: string;
  contentType?: string;
};

export async function miaText(input: {
  contentType: string;
  input: string;
  locale?: string;
}): Promise<MiaTextResponse> {
  const res = await fetch("/api/mia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as any;

  if (!res.ok) {
    throw new Error(data?.error ?? "MIA text request failed");
  }

  return {
    output: String(data?.output ?? ""),
    contentType: data?.contentType,
  };
}

export async function miaTts(input: {
  contentType: string;
  input: string;
  locale?: string;
}): Promise<Blob> {
  const res = await fetch("/api/mia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let msg = "MIA TTS request failed";
    try {
      const data = await res.json();
      msg = data?.error ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const buf = await res.arrayBuffer();
  return new Blob([buf], { type: "audio/mpeg" });
}