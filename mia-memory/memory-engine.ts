// mia-memory/memory-engine.ts
import {
  ensureUserMemory,
  saveUserMemory,
  bumpUsed,
  pushSession,
  type UserMemory,
} from "./memory-store";

export type MemoryWindowDays = 30 | 90;

export type MemoryEngineConfig = {
  window_days?: MemoryWindowDays; // anti repetición (fase siguiente)
  max_sessions?: number; // override del límite si lo necesitás luego
};

export type MemoryHit = {
  key: string;
  last_used_at: string;
  used_count: number;
  days_ago: number;
};

function daysBetweenIso(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  const ms = Math.abs(b - a);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Engine de memoria (v1)
 * - Carga memoria por userId
 * - Registra mecanismos/ocurrencias usados
 * - Registra sesiones
 * - Persiste en disco
 *
 * NO decide narrativa todavía. Solo guarda/consulta señales.
 */
export class MemoryEngine {
  private cfg: Required<MemoryEngineConfig>;
  private userId: string;
  private memory: UserMemory | null = null;

  constructor(userId: string, cfg: MemoryEngineConfig = {}) {
    this.userId = userId;
    this.cfg = {
      window_days: cfg.window_days ?? 30,
      max_sessions: cfg.max_sessions ?? 300,
    };
  }

  async load(): Promise<UserMemory> {
    this.memory = await ensureUserMemory(this.userId);

    // refuerzo del límite de sesiones (por si el store cambia luego)
    if (this.memory.sessions.length > this.cfg.max_sessions) {
      this.memory.sessions.splice(0, this.memory.sessions.length - this.cfg.max_sessions);
    }

    return this.memory;
  }

  get(): UserMemory {
    if (!this.memory) {
      throw new Error("MemoryEngine: call load() before get()");
    }
    return this.memory;
  }

  /**
   * Marca uso de un mecanismo narrativo (por key estable).
   */
  markMechanismUsed(key: string, atIso?: string): void {
    const mem = this.get();
    bumpUsed(mem.mechanisms_used, key, atIso);
  }

  /**
   * Marca uso de una ocurrencia (por key estable).
   */
  markOccurrenceUsed(key: string, atIso?: string): void {
    const mem = this.get();
    bumpUsed(mem.occurrences_used, key, atIso);
  }

  /**
   * Registra una sesión mínima (trazabilidad sin inflar almacenamiento).
   */
  addSession(entry: {
    content_type?: string;
    item_key?: string;
    meta?: Record<string, unknown>;
  }, atIso?: string): void {
    const mem = this.get();
    pushSession(mem.sessions, entry, atIso);

    // enforce límite local del engine
    if (mem.sessions.length > this.cfg.max_sessions) {
      mem.sessions.splice(0, mem.sessions.length - this.cfg.max_sessions);
    }
  }

  /**
   * Consulta “hits” dentro de la ventana para anti-repetición.
   * (No filtra nada por sí mismo; solo devuelve señales.)
   */
  getRecentMechanismHits(windowDays = this.cfg.window_days): MemoryHit[] {
    const mem = this.get();
    const nowIso = new Date().toISOString();
    const out: MemoryHit[] = [];

    for (const k of Object.keys(mem.mechanisms_used)) {
      const it = mem.mechanisms_used[k];
      const days = daysBetweenIso(it.last_used_at, nowIso);
      if (days <= windowDays) {
        out.push({ key: it.key, last_used_at: it.last_used_at, used_count: it.used_count, days_ago: days });
      }
    }
    return out.sort((a, b) => a.days_ago - b.days_ago);
  }

  getRecentOccurrenceHits(windowDays = this.cfg.window_days): MemoryHit[] {
    const mem = this.get();
    const nowIso = new Date().toISOString();
    const out: MemoryHit[] = [];

    for (const k of Object.keys(mem.occurrences_used)) {
      const it = mem.occurrences_used[k];
      const days = daysBetweenIso(it.last_used_at, nowIso);
      if (days <= windowDays) {
        out.push({ key: it.key, last_used_at: it.last_used_at, used_count: it.used_count, days_ago: days });
      }
    }
    return out.sort((a, b) => a.days_ago - b.days_ago);
  }

  /**
   * Persiste todo.
   */
  async save(): Promise<void> {
    const mem = this.get();
    await saveUserMemory(this.userId, mem);
  }
}