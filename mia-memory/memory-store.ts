// mia-memory/memory-store.ts
import fs from "fs/promises";
import path from "path";

/**
 * Memoria evolutiva (v1) — store simple en JSON por usuario.
 * Objetivo: leer/guardar "estado" por userId sin romper arquitectura actual.
 *
 * Estructura en disco:
 *  mia-memory/
 *    user_memory/
 *      <userId>/
 *        profile.json
 *        mechanisms_used.json
 *        occurrences_used.json
 *        sessions.json
 */

export type IsoDateString = string;

export type UsedItem = {
  key: string; // identificador estable del mecanismo/ocurrencia
  last_used_at: IsoDateString;
  used_count: number;
};

export type UserProfile = {
  user_id: string;
  created_at: IsoDateString;
  updated_at: IsoDateString;
  // espacio para evolución: tono, preferencias, flags, etc.
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
    // Para trazabilidad mínima, sin guardar texto completo (evita crecer infinito)
    meta?: Record<string, unknown>;
  }>;
};

const ROOT_DIR = process.cwd();
const MEMORY_ROOT = path.join(ROOT_DIR, "mia-memory", "user_memory");

function nowIso(): IsoDateString {
  return new Date().toISOString();
}

/**
 * Sanitiza userId para uso como nombre de carpeta.
 * Conserva letras/números/guiones/underscores; todo lo demás => "_"
 */
export function sanitizeUserId(userId: string): string {
  const raw = (userId || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  return safe.length ? safe : "anonymous";
}

export function getUserDir(userId: string): string {
  return path.join(MEMORY_ROOT, sanitizeUserId(userId));
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const buf = await fs.readFile(filePath, "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

/**
 * Escritura atómica: escribe a .tmp y luego rename.
 * Evita archivos corruptos si el proceso se corta a mitad.
 */
async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmp = `${filePath}.tmp`;
  const payload = JSON.stringify(data, null, 2);

  await fs.writeFile(tmp, payload, "utf8");
  await fs.rename(tmp, filePath);
}

function filePathsForUser(userId: string) {
  const dir = getUserDir(userId);
  return {
    dir,
    profile: path.join(dir, "profile.json"),
    mechanisms: path.join(dir, "mechanisms_used.json"),
    occurrences: path.join(dir, "occurrences_used.json"),
    sessions: path.join(dir, "sessions.json"),
  };
}

export async function ensureUserMemory(userId: string): Promise<UserMemory> {
  const safeId = sanitizeUserId(userId);
  const { dir, profile, mechanisms, occurrences, sessions } = filePathsForUser(safeId);

  await ensureDir(dir);

  const created = nowIso();

  const defaultProfile: UserProfile = {
    user_id: safeId,
    created_at: created,
    updated_at: created,
    traits: {},
  };

  const loadedProfile = await readJsonFile<UserProfile>(profile, defaultProfile);
  const loadedMechanisms = await readJsonFile<Record<string, UsedItem>>(mechanisms, {});
  const loadedOccurrences = await readJsonFile<Record<string, UsedItem>>(occurrences, {});
  const loadedSessions = await readJsonFile<UserMemory["sessions"]>(sessions, []);

  // Si el profile no existía, lo dejamos persistido
  if (loadedProfile.created_at === defaultProfile.created_at && loadedProfile.updated_at === defaultProfile.updated_at) {
    await writeJsonFileAtomic(profile, loadedProfile);
  }

  return {
    profile: loadedProfile,
    mechanisms_used: loadedMechanisms,
    occurrences_used: loadedOccurrences,
    sessions: loadedSessions,
  };
}

export async function saveUserMemory(userId: string, memory: UserMemory): Promise<void> {
  const safeId = sanitizeUserId(userId);
  const { profile, mechanisms, occurrences, sessions } = filePathsForUser(safeId);

  const updatedAt = nowIso();
  memory.profile.updated_at = updatedAt;

  await Promise.all([
    writeJsonFileAtomic(profile, memory.profile),
    writeJsonFileAtomic(mechanisms, memory.mechanisms_used),
    writeJsonFileAtomic(occurrences, memory.occurrences_used),
    writeJsonFileAtomic(sessions, memory.sessions),
  ]);
}

/**
 * Registra “uso” de una key en el mapa correspondiente.
 * (Esto alimenta ANTI_REPETICION_MIA en la fase siguiente.)
 */
export function bumpUsed(map: Record<string, UsedItem>, key: string, atIso: IsoDateString = nowIso()): void {
  const k = (key || "").trim();
  if (!k) return;

  const prev = map[k];
  if (!prev) {
    map[k] = { key: k, last_used_at: atIso, used_count: 1 };
    return;
  }

  map[k] = {
    key: k,
    last_used_at: atIso,
    used_count: (prev.used_count || 0) + 1,
  };
}

/**
 * Agrega una entrada mínima de sesión (trazabilidad sin inflar storage).
 */
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

  // límite duro para no crecer infinito (ajustable)
  const MAX = 300;
  if (sessions.length > MAX) sessions.splice(0, sessions.length - MAX);
}
