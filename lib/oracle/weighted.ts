import type { Entry } from "../schema";
import type { Rng } from "./rng";

/**
 * Los cuatro modos de invocación, como vectores de peso sobre las tres
 * puntuaciones de cada entrada.
 *
 * AVISO: el kit decía que estos pesos estaban calibrados, pero el archivo no
 * venía. Los valores de abajo son provisionales (fase 0) y cambiarlos cambia
 * lo que devuelve cada semilla.
 */
export const MODES = ["normal", "rara", "oscura", "material"] as const;
export type Mode = (typeof MODES)[number];

interface ModeVector {
  strangeness: number;
  darkness: number;
  fictionality: number;
}

/**
 * Exponentes sobre la puntuación normalizada (puntuación / 3): 0 no cuenta,
 * positivo favorece lo alto, negativo favorece lo bajo.
 */
export const MODE_VECTORS: Record<Mode, ModeVector> = {
  normal: { strangeness: 0.5, darkness: 0, fictionality: 0 },
  rara: { strangeness: 2, darkness: 0, fictionality: 0.5 },
  oscura: { strangeness: 0.5, darkness: 2, fictionality: 0 },
  material: { strangeness: 0, darkness: 0, fictionality: -2 },
};

export function weightOf(entry: Entry, mode: Mode): number {
  // Las entradas sin verificar participan en todo, menos en modo material.
  if (mode === "material" && entry.epistemicStatus === "unverified") return 0;
  const v = MODE_VECTORS[mode];
  const s = entry.scores;
  return (
    Math.pow(s.strangeness / 3, v.strangeness) *
    Math.pow(s.darkness / 3, v.darkness) *
    Math.pow(s.fictionality / 3, v.fictionality)
  );
}

/** Selección ponderada. Null si nada tiene peso. */
export function pickWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rng: Rng,
): T | null {
  const weights = items.map((item) => {
    const w = weight(item);
    return w > 0 && Number.isFinite(w) ? w : 0;
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return null;

  let r = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    if (weights[i] === 0) continue;
    r -= weights[i];
    if (r < 0) return items[i];
  }
  // Redondeo en coma flotante: el último con peso.
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (weights[i] > 0) return items[i];
  }
  return null;
}
