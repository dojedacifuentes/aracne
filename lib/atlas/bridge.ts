import type { RingCategory } from "../content/corpus";
import type { Entry } from "../schema";

import type { Cause } from "./world";

/**
 * El puente entre el Atlas y el archivo.
 *
 * Una causa no lista entradas a mano. Declara con qué **patas** cruza y con
 * qué **tags** del archivo, y el cruce se calcula: si alguien escribe mañana
 * una entrada sobre el olvido, aparecerá sola bajo «disolución del lenguaje»
 * sin que nadie toque el Atlas. Es lo mismo que hace el grafo de la tela, con
 * el mismo criterio: **el vínculo existe porque los dos extremos lo dicen**,
 * no porque un tercero los haya emparejado.
 *
 * Un tag vale más que una pata: una pata agrupa a docenas de entradas y un
 * tag señala a dos o tres. Lo raro pesa más que lo común, que es la regla de
 * todo este archivo.
 */

/** Lo que aporta compartir un tag. */
const TAG_WEIGHT = 3;
/** Lo que aporta compartir una pata. */
const LEG_WEIGHT = 1;

export interface Bridge {
  entry: Entry;
  score: number;
  /** Los tags que las unen, para poder decir por qué. */
  tags: string[];
  /** Las patas que comparten. */
  categories: string[];
}

/** Las entradas del archivo que tocan una causa, de la que más toca a la que menos. */
export function entriesForCause(cause: Cause, entries: readonly Entry[]): Bridge[] {
  const tags = new Set(cause.tags);
  const legs = new Set(cause.categories);
  const out: Bridge[] = [];
  for (const entry of entries) {
    const comunes = entry.tags.filter((tag) => tags.has(tag));
    const patas = entry.categories.filter((id) => legs.has(id));
    const score = comunes.length * TAG_WEIGHT + patas.length * LEG_WEIGHT;
    if (score > 0) out.push({ entry, score, tags: comunes, categories: patas });
  }
  // Empates por id: el orden no puede depender de en qué orden se leyó nada.
  return out.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
}

/** El camino de vuelta: las causas del Atlas que tocan una entrada. */
export function causesForEntry(entry: Entry, causes: readonly Cause[]): Cause[] {
  const tags = new Set(entry.tags);
  const legs = new Set(entry.categories);
  return causes
    .map((cause) => ({
      cause,
      score:
        cause.tags.filter((tag) => tags.has(tag)).length * TAG_WEIGHT +
        cause.categories.filter((id) => legs.has(id)).length * LEG_WEIGHT,
    }))
    .filter((par) => par.score > 0)
    .sort((a, b) => b.score - a.score || a.cause.id.localeCompare(b.cause.id))
    .map((par) => par.cause);
}

/** Por qué una causa y una entrada se tocan, dicho en una línea. */
export function bridgeText(bridge: Bridge, categories: readonly RingCategory[]): string {
  if (bridge.tags.length > 0) return `por ${bridge.tags.join(', ')}`;
  const nombres = bridge.categories.map(
    (id) => categories.find((c) => c.id === id)?.name.toLowerCase() ?? id,
  );
  return `por ${nombres.join(', ')}`;
}
