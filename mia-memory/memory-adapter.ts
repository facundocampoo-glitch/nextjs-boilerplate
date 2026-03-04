// mia-memory/memory-adapter.ts
import { MemoryEngine } from "./memory-engine";

export type MIARequestMemoryContext = {
  userId: string;
  contentType?: string;
  itemKey?: string;
  // metadata mínima para trazabilidad (no guardar texto completo)
  meta?: Record<string, unknown>;
};

export type MIARequestMemoryResult = {
  recentMechanismHits30: ReturnType<MemoryEngine["getRecentMechanismHits"]>;
  recentOccurrenceHits30: ReturnType<MemoryEngine["getRecentOccurrenceHits"]>;
};

/**
 * Adaptador simple para el endpoint:
 * - load memoria por userId
 * - registra sesión mínima
 * - expone "señales" de anti-repetición (aún sin aplicar filtros)
 * - save al final
 *
 * En /api/mia:
 *   const { memory, signals, commit } = await openMIAUserMemory(...)
 *   ... motor MIA ...
 *   memory.markMechanismUsed(...)
 *   memory.markOccurrenceUsed(...)
 *   await commit()
 */
export async function openMIAUserMemory(ctx: MIARequestMemoryContext): Promise<{
  memory: MemoryEngine;
  signals: MIARequestMemoryResult;
  commit: () => Promise<void>;
}> {
  const userId = (ctx.userId || "").trim() || "anonymous";

  // ventana 30 días por default (fase siguiente: configurable 30/90)
  const memory = new MemoryEngine(userId, { window_days: 30 });
  await memory.load();

  // sesión mínima (no guardar input/output completo)
  memory.addSession({
    content_type: ctx.contentType,
    item_key: ctx.itemKey,
    meta: ctx.meta,
  });

  const signals: MIARequestMemoryResult = {
    recentMechanismHits30: memory.getRecentMechanismHits(30),
    recentOccurrenceHits30: memory.getRecentOccurrenceHits(30),
  };

  return {
    memory,
    signals,
    commit: async () => {
      await memory.save();
    },
  };
}