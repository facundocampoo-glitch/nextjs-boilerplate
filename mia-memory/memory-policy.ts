// mia-memory/memory-policy.ts
import type { MemoryHit } from "./memory-engine";

export type AvoidPolicyConfig = {
  window_days: 30 | 90;
  max_avoid: number; // cuántos evitar
  // si un ítem fue usado muchas veces, sube prioridad aunque no sea el más reciente
  weight_count: number; // 0..2 típico
  weight_recency: number; // 0..2 típico
};

const DEFAULT_CFG: AvoidPolicyConfig = {
  window_days: 30,
  max_avoid: 3,
  weight_count: 1,
  weight_recency: 1,
};

function score(hit: MemoryHit, cfg: AvoidPolicyConfig): number {
  // menor days_ago => más alto score (más “evitar”)
  const recencyScore = hit.days_ago <= 0 ? 999 : 1 / hit.days_ago;
  const countScore = hit.used_count || 0;
  return cfg.weight_recency * recencyScore + cfg.weight_count * countScore;
}

/**
 * Devuelve keys a evitar en la ventana (30/90d).
 * - ordena por score (recencia + frecuencia)
 * - devuelve top N
 */
export function computeAvoidList(
  hits: MemoryHit[],
  cfgPartial: Partial<AvoidPolicyConfig> = {}
): string[] {
  const cfg: AvoidPolicyConfig = { ...DEFAULT_CFG, ...cfgPartial };

  const filtered = hits.filter((h) => Number.isFinite(h.days_ago) && h.days_ago <= cfg.window_days);

  const sorted = [...filtered].sort((a, b) => score(b, cfg) - score(a, cfg));

  const out: string[] = [];
  const seen = new Set<string>();

  for (const h of sorted) {
    const k = (h.key || "").trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= cfg.max_avoid) break;
  }

  return out;
}