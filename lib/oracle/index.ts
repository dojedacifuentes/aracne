import type { Entry, EntryType } from "../schema";
import { invoke, type Invocation } from "./invoke";
import { freshSeed, rngFromString } from "./rng";
import { pickWeighted, weightOf, type Mode } from "./weighted";

export interface DrawFilters {
  categories?: string[];
  types?: EntryType[];
  contributors?: string[];
}

/** Una sola entrada, con modo, filtros y anti-repetición. */
export function draw(
  corpus: Entry[],
  seed: string,
  opts: { mode?: Mode; filters?: DrawFilters; history?: readonly string[] } = {},
): Entry | null {
  const mode = opts.mode ?? "normal";
  const f = opts.filters ?? {};
  const recent = new Set((opts.history ?? []).slice(0, 4));

  const pool = corpus.filter(
    (e) =>
      (!f.categories?.length || f.categories.some((c) => e.categories.includes(c))) &&
      (!f.types?.length || f.types.includes(e.type)) &&
      (!f.contributors?.length || f.contributors.some((c) => e.contributors.includes(c))),
  );
  const fresh = pool.filter((e) => !recent.has(e.id));
  const rng = rngFromString(`draw|${seed}|${mode}`);
  return pickWeighted(fresh.length > 0 ? fresh : pool, (e) => weightOf(e, mode), rng);
}

/**
 * La semilla de una pulsación. El historial no entra en `invoke()`, porque la
 * misma URL tiene que devolver lo mismo en cualquier parte: se prueba una
 * semilla nueva y, si lo primero que saldría acaba de salir, se prueba otra,
 * hasta `tries` veces.
 */
export function pressSeed(
  corpus: Entry[],
  legs: string[],
  now: number,
  counter: number,
  history: readonly string[] = [],
  tries = 6,
): { seed: string; invocation: Invocation | null } {
  const recent = new Set(history.slice(0, 4));
  let seed = freshSeed(now, counter);
  let invocation = invoke(corpus, seed, legs);
  for (let i = 1; i < tries && invocation && recent.has(invocation.entries[0].id); i += 1) {
    seed = freshSeed(now + i, counter);
    invocation = invoke(corpus, seed, legs);
  }
  return { seed, invocation };
}
