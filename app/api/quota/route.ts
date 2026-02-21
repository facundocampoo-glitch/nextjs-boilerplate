export const runtime = "nodejs";

function monthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

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

async function sbSelectOne(table: string, query: string) {
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
  const arr = await r.json();
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
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
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  // si choca el PK, supabase puede responder 409
  if (r.status === 409) return { ok: true, duplicate: true };

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase insert error: ${t}`);
  }
  return { ok: true, duplicate: false };
}

async function sbPatch(table: string, filterQuery: string, patchBody: any) {
  const { url, serviceKey } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${table}?${filterQuery}`;

  const r = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patchBody),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase patch error: ${t}`);
  }
  const arr = await r.json();
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

function getLimitForModule(module: string): number {
  if (module === "suenos") return 4;
  if (module === "psicomagia") return 4;
  return 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body?.action || "").trim(); // "check" | "consume"
    const module = String(body?.module || "").trim(); // "suenos" | "psicomagia"
    const user_profile = body?.user_profile;

    if (!action || (action !== "check" && action !== "consume")) {
      return Response.json({ ok: false, error: "action inválida (check|consume)" }, { status: 400 });
    }
    if (!module || (module !== "suenos" && module !== "psicomagia")) {
      return Response.json({ ok: false, error: "module inválido (suenos|psicomagia)" }, { status: 400 });
    }
    if (!user_profile?.name) {
      return Response.json({ ok: false, error: "Falta user_profile.name" }, { status: 400 });
    }

    const limit = getLimitForModule(module);
    const user_id = normalizeUserIdFromProfile(user_profile);
    const mk = monthKey();

    // leer estado actual
    const existing = await sbSelectOne(
      "quota_monthly",
      `select=user_id,month_key,dreams_used,psicomagia_used&user_id=eq.${encodeURIComponent(
        user_id
      )}&month_key=eq.${encodeURIComponent(mk)}&limit=1`
    );

    const dreams_used = Number(existing?.dreams_used ?? 0);
    const psicomagia_used = Number(existing?.psicomagia_used ?? 0);

    const used = module === "suenos" ? dreams_used : psicomagia_used;
    const allowed = used < limit;

    if (action === "check") {
      return Response.json(
        { ok: true, module, month_key: mk, used, limit, allowed },
        { status: 200 }
      );
    }

    // action === "consume"
    if (!allowed) {
      return Response.json(
        { ok: true, module, month_key: mk, used, limit, allowed: false, consumed: false },
        { status: 200 }
      );
    }

    // si no existe fila del mes, la creamos
    if (!existing) {
      const row =
        module === "suenos"
          ? { user_id, month_key: mk, dreams_used: 1, psicomagia_used: 0 }
          : { user_id, month_key: mk, dreams_used: 0, psicomagia_used: 1 };

      // si justo alguien la creó antes, no pasa nada, luego hacemos patch
      await sbInsert("quota_monthly", row);
    }

    // re-leer y actualizar sumando 1
    const current = await sbSelectOne(
      "quota_monthly",
      `select=user_id,month_key,dreams_used,psicomagia_used&user_id=eq.${encodeURIComponent(
        user_id
      )}&month_key=eq.${encodeURIComponent(mk)}&limit=1`
    );

    const curDreams = Number(current?.dreams_used ?? 0);
    const curPsi = Number(current?.psicomagia_used ?? 0);

    const next =
      module === "suenos"
        ? { dreams_used: curDreams + 1 }
        : { psicomagia_used: curPsi + 1 };

    const updated = await sbPatch(
      "quota_monthly",
      `user_id=eq.${encodeURIComponent(user_id)}&month_key=eq.${encodeURIComponent(mk)}`,
      next
    );

    const newDreams = Number(updated?.dreams_used ?? (module === "suenos" ? curDreams + 1 : curDreams));
    const newPsi = Number(updated?.psicomagia_used ?? (module === "psicomagia" ? curPsi + 1 : curPsi));
    const newUsed = module === "suenos" ? newDreams : newPsi;

    return Response.json(
      { ok: true, module, month_key: mk, used: newUsed, limit, allowed: newUsed < limit, consumed: true },
      { status: 200 }
    );
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Error desconocido" }, { status: 500 });
  }
}
