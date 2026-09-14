import type { LegState } from "../content/corpus";
import type { Entry } from "../schema";

/**
 * La forma del archivo.
 *
 * La crítica de Whitelaw a las colecciones digitales es que buscar es tacaño:
 * obliga a preguntar y esconde todo lo demás. Una interfaz generosa enseña de
 * entrada cuánto hay y cómo está repartido, para que se pueda explorar sin
 * saber qué se busca.
 *
 * Aquí se calcula esa forma. Es aritmética sobre el contenido, nada más: no
 * hay ranking, ni recomendación, ni nada que decida por quien mira.
 */

export interface Slice {
  id: string;
  count: number;
  /** Proporción sobre el total, de 0 a 1. */
  share: number;
}

export interface Shape {
  entries: number;
  /** Patas encendidas y patas en reserva. */
  lit: number;
  retracted: number;
  types: Slice[];
  statuses: Slice[];
  legs: Slice[];
  /** Tags que aparecen en más de una entrada, de más a menos. */
  tags: Slice[];
  /** Medias de las tres puntuaciones, de 1 a 5. */
  averages: { strangeness: number; darkness: number; fictionality: number };
  /** Entradas sin verificar: la cola editorial, que conviene tener a la vista. */
  pending: number;
}

function tally(values: string[], total: number): Slice[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count, share: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

export function shapeOf(entries: readonly Entry[], legs: readonly LegState[]): Shape {
  const n = entries.length;
  const mean = (pick: (e: Entry) => number) =>
    n === 0 ? 0 : Math.round((entries.reduce((s, e) => s + pick(e), 0) / n) * 10) / 10;

  return {
    entries: n,
    lit: legs.filter((l) => l.visible).length,
    retracted: legs.filter((l) => !l.visible).length,
    types: tally(entries.map((e) => e.type), n),
    statuses: tally(entries.map((e) => e.epistemicStatus), n),
    legs: legs
      .map((l) => ({ id: l.category.id, count: l.count, share: n > 0 ? l.count / n : 0 }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    tags: tally(entries.flatMap((e) => e.tags), n).filter((t) => t.count > 1),
    averages: {
      strangeness: mean((e) => e.scores.strangeness),
      darkness: mean((e) => e.scores.darkness),
      fictionality: mean((e) => e.scores.fictionality),
    },
    pending: entries.filter((e) => e.epistemicStatus === "unverified").length,
  };
}
