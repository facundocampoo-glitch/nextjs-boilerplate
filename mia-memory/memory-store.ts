// mia-memory/memory-store.ts
// Migrado de archivos locales a Supabase para compatibilidad con Vercel

export type IsoDateString = string;

export type UsedItem = {
  key: string;
  last_used_at: IsoDateString;
  used_count: number;
};

export type UserProfile = {
  user_id: string;
  created_at: IsoDateString;
  updated_at: IsoDateString;
  traits?: Record<string, unknown>;
};

export type UserMemory = {
  profile: UserProfile;
  mechanisms_used: Record<string, UsedItem>;
  occurrences_used: Record<string, UsedItem>;
  sessions: Array<{
    at: IsoDateString;
    content_type?: string;
    item_key?: string;
    meta?: Record<string, unknown>;
  }>;
};

function nowIso(): IsoDateString {
  return new Date().toISOString();
}

export function sanitizeUserId(userId: string): string {
  const raw = (userId || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  return safe.length ? safe : "anonymous";
}

function getSupabaseClient() {
  const url = process.env.mia_SUPABASE_URL;
  const key = process.env.mia_SUPABASE_ANON_KEY || process.env.mia_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  return { url, key };
}

async function fetchMemory(userId: string): Promise<UserMemory | null> {
  const { url, key } = getSupabaseClient();
  const res = await fetch(
    `${url}/rest/v1/mia_memory?user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  return {
    profile: row.profile || {},
    mechanisms_used: row.mechanisms_used || {},
    occurrences_used: row.occurrences_used || {},
    sessions: row.sessions || [],
  };
}

async function upsertMemory(userId: string, memory: UserMemory): Promise<void> {
  const { url, key } = getSupabaseClient();
  await fetch(`${url}/rest/v1/mia_memory`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      profile: memory.profile,
      mechanisms_used: memory.mechanisms_used,
      occurrences_used: memory.occurrences_used,
      sessions: memory.sessions,
      updated_at: nowIso(),
    }),
  });
}

export async function ensureUserMemory(userId: string): Promise<UserMemory> {
  const safeId = sanitizeUserId(userId);
  const existing = await fetchMemory(safeId);
  if (existing) return existing;

  const created = nowIso();
  const fresh: UserMemory = {
    profile: {
      user_id: safeId,
      created_at: created,
      updated_at: created,
      traits: {},
    },
    mechanisms_used: {},
    occurrences_used: {},
    sessions: [],
  };
  await upsertMemory(safeId, fresh);
  return fresh;
}

export async function saveUserMemory(userId: string, memory: UserMemory): Promise<void> {
  const safeId = sanitizeUserId(userId);
  memory.profile.updated_at = nowIso();
  await upsertMemory(safeId, memory);
}

export function bumpUsed(
  map: Record<string, UsedItem>,
  key: string,
  atIso: IsoDateString = nowIso()
): void {
  const k = (key || "").trim();
  if (!k) return;
  const prev = map[k];
  if (!prev) {
    map[k] = { key: k, last_used_at: atIso, used_count: 1 };
    return;
  }
  map[k] = { key: k, last_used_at: atIso, used_count: (prev.used_count || 0) + 1 };
}

export function pushSession(
  sessions: UserMemory["sessions"],
  entry: {
    content_type?: string;
    item_key?: string;
    meta?: Record<string, unknown>;
  },
  atIso: IsoDateString = nowIso()
): void {
  sessions.push({
    at: atIso,
    content_type: entry.content_type,
    item_key: entry.item_key,
    meta: entry.meta,
  });
  const MAX = 300;
  if (sessions.length > MAX) sessions.splice(0, sessions.length - MAX);
}
