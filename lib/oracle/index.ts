import type { Entry, EntryType } from "../schema";
import { invoke, type Invocation } from "./invoke";
import { freshSeed, rngFromString } from "./rng";
import { pickWeighted, weightOf, type Mode } from "./weighted";

export interface DrawFilters {
  categories?: string[];
  types?: EntryType[];
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
      (!f.types?.length || f.types.includes(e.type))
  );
  const fresh = pool.filter((e) => !recent.has(e.id));
  const rng = rngFromString(`draw|${seed}|${mode}`);
  return pickWeighted(fresh.length > 0 ? fresh : pool, (e) => weightOf(e, mode), rng);
}

/**
 * La semilla de una pulsación. El historial no entra en `invoke()`, porque la
 * misma URL tiene que devolver lo mismo en cualquier parte: se prueban
 * semillas nuevas y se queda la primera cuya entrada principal no salió en las
 * cuatro últimas. Si el archivo es tan pequeño que no la hay, al menos una que
 * no repita la inmediatamente anterior.
 */
export function pressSeed(
  corpus: Entry[],
  legs: string[],
  now: number,
  counter: number,
  history: readonly string[] = [],
  tries = 8,
): { seed: string; invocation: Invocation | null } {
  const recent = new Set(history.slice(0, 4));
  const previous = history[0];
  let best = { seed: freshSeed(now, counter), invocation: null as Invocation | null, score: -2 };

  for (let i = 0; i < tries; i += 1) {
    const seed = freshSeed(now + i, counter);
    const invocation = invoke(corpus, seed, legs);
    const first = invocation?.entries[0]?.id;
    const score = !first ? -1 : !recent.has(first) ? 2 : first !== previous ? 1 : 0;
    if (score > best.score) best = { seed, invocation, score };
    if (score === 2) break;
  }
  return { seed: best.seed, invocation: best.invocation };
}
