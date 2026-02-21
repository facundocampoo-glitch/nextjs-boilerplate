export const runtime = "nodejs";

function normalizeUserIdFromProfile(user_profile: any): string {
  const n = String(user_profile?.name || "anon").trim().toLowerCase();
  return n.replace(/\s+/g, "_");
}

function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_REST_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url) throw new Error("Falta SUPABASE URL (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL)");
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");

  return { url, serviceKey };
}

async function sbSelect(table: string, query: string) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const r = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase select error: ${t}`);
  }
  return await r.json();
}

async function sbInsert(table: string, row: any) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}`;
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase insert error: ${t}`);
  }
  const arr = await r.json();
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body?.action || "").trim(); // "list" | "add"
    const user_profile = body?.user_profile;

    if (!action || (action !== "list" && action !== "add")) {
      return Response.json({ ok: false, error: "action inválida (list|add)" }, { status: 400 });
    }

    if (!user_profile?.name) {
      return Response.json({ ok: false, error: "Falta user_profile.name" }, { status: 400 });
    }

    const user_id = normalizeUserIdFromProfile(user_profile);

    if (action === "list") {
      const rows = await sbSelect(
        "memory_items",
        `select=id,kind,content,score,is_active,created_at&user_id=eq.${encodeURIComponent(
          user_id
        )}&is_active=eq.true&order=updated_at.desc&limit=50`
      );

      return Response.json({ ok: true, user_id, items: rows }, { status: 200 });
    }

    // action === "add"
    const kind = String(body?.kind || "").trim(); // ej: "preferencia" "limite" "tema"
    const content = String(body?.content || "").trim();

    if (!kind) {
      return Response.json({ ok: false, error: "Falta kind" }, { status: 400 });
    }
    if (!content) {
      return Response.json({ ok: false, error: "Falta content" }, { status: 400 });
    }

    const inserted = await sbInsert("memory_items", {
      user_id,
      kind,
      content,
      score: 1,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, user_id, inserted }, { status: 200 });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}
