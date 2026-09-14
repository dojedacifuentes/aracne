import type { Entry } from "../schema";
import { rngFromString, type Rng } from "../oracle/rng";

export const WEIGHTS = {
  explicit: 10,
  tag: 5,
  category: 4,
  author: 3,
  type: 2,
} as const;

export type LinkReason = keyof typeof WEIGHTS;

export interface Link {
  to: string;
  score: number;
  reason: LinkReason;
  /** Lo concreto que compartían: el tag, la categoría, el autor. */
  label: string;
}

function authorsOf(entry: Entry): string[] {
  return entry.sources.map((s) => s.author).filter(Boolean) as string[];
}

function shared<T>(a: T[], b: T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/** Puntúa el vínculo entre dos entradas y guarda la razón más fuerte. */
export function scoreLink(a: Entry, b: Entry): Link | null {
  let score = 0;
  let best: { reason: LinkReason; label: string } | null = null;

  const consider = (reason: LinkReason, label: string) => {
    score += WEIGHTS[reason];
    if (!best || WEIGHTS[reason] > WEIGHTS[best.reason]) best = { reason, label };
  };

  if (a.related.includes(b.id) || b.related.includes(a.id)) {
    consider("explicit", "relación explícita");
  }
  for (const tag of shared(a.tags, b.tags)) consider("tag", tag);
  for (const cat of shared(a.categories, b.categories)) consider("category", cat);
  for (const author of shared(authorsOf(a), authorsOf(b))) consider("author", author);
  if (a.type === b.type) consider("type", a.type);

  if (!best) return null;
  return { to: b.id, score, reason: best.reason, label: best.label };
}

export function neighbours(entry: Entry, corpus: Entry[]): Link[] {
  return corpus
    .filter((e) => e.id !== entry.id)
    .map((e) => scoreLink(entry, e))
    .filter((l): l is Link => l !== null)
    .sort((a, b) => b.score - a.score);
}

export interface DriftStep {
  entry: Entry;
  /** null en el primer paso. */
  link: Link | null;
}

/**
 * Construye una cadena de entradas relacionadas.
 *
 * La perturbación es lo que impide que la misma entrada produzca siempre la
 * misma ruta: se barajan los vecinos con un ruido proporcional a su score,
 * de modo que el mejor vecino suele ganar pero no siempre. Parcialmente
 * azarosa, nunca arbitraria.
 */
export function buildDrift(
  start: Entry,
  corpus: Entry[],
  length: number,
  seed: string,
): DriftStep[] {
  const rng: Rng = rngFromString(`drift:${seed}:${start.id}`);
  const byId = new Map(corpus.map((e) => [e.id, e]));
  const visited = new Set([start.id]);
  const steps: DriftStep[] = [{ entry: start, link: null }];

  let current = start;
  while (steps.length < length) {
    const options = neighbours(current, corpus).filter((l) => !visited.has(l.to));
    if (options.length === 0) break;

    const perturbed = options
      .map((l) => ({ link: l, k: l.score * (0.7 + rng() * 0.6) }))
      .sort((a, b) => b.k - a.k);

    const link = perturbed[0].link;
    const next = byId.get(link.to);
    if (!next) break;

    visited.add(next.id);
    steps.push({ entry: next, link });
    current = next;
  }

  return steps;
}

/** Camino más corto entre dos entradas. Null si no hay ruta. */
export function shortestPath(
  from: Entry,
  to: Entry,
  corpus: Entry[],
): DriftStep[] | null {
  const byId = new Map(corpus.map((e) => [e.id, e]));
  const prev = new Map<string, Link>();
  const seen = new Set([from.id]);
  const queue: Entry[] = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === to.id) break;
    for (const link of neighbours(current, corpus)) {
      if (seen.has(link.to)) continue;
      seen.add(link.to);
      prev.set(link.to, { ...link, to: current.id });
      const next = byId.get(link.to);
      if (next) queue.push(next);
    }
  }

  if (!seen.has(to.id)) return null;

  const path: DriftStep[] = [];
  let cursor: Entry | undefined = to;
  while (cursor) {
    const link = prev.get(cursor.id);
    path.unshift({ entry: cursor, link: link ?? null });
    cursor = link ? byId.get(link.to) : undefined;
  }
  return path;
}
