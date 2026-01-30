export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Falta OPENAI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: "Decime una frase corta, irónica y tierna, en voseo rioplatense.",
    }),
  });

  if (!r.ok) {
    return new Response(JSON.stringify({ error: await r.text() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await r.json();
  return new Response(JSON.stringify({ text: data.output_text }), {
    headers: { "Content-Type": "application/json" },
  });
}
