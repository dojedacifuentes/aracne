import type { Ring } from "../aleph/tension";
import type { RingCategory } from "../content/corpus";
import type { Entry } from "../schema";
import { neighbours, shortestPath, type DriftStep } from "./graph";

/** Las tres maneras de leer la red. */
export type DriftMode = "deriva" | "dos-mundos" | "distancia";

/**
 * Los dos modos de lectura del grafo que pide la fase 5.
 *
 * Ninguno de los dos resuelve nada: uno devuelve un desajuste y el otro una
 * ruta. Los dos son lecturas del mismo grafo que ya estaba escrito en
 * `graph.ts`.
 */

export interface TwoWorlds {
  from: RingCategory;
  /** Las dos patas que flanquean el hueco de enfrente. Siempre dos. */
  facing: [RingCategory, RingCategory];
}

/**
 * Dos mundos: la antípoda de una pata.
 *
 * En un anillo par cada pata tendría su opuesta exacta y el cruce saldría
 * simétrico y previsible. Once es impar, así que enfrente de cualquier pata no
 * hay otra pata: hay un hueco entre dos. Este modo devuelve esas dos y deja el
 * desajuste sin resolver, que es justamente de lo que trata (docs/ARANA.md).
 */
export function twoWorlds(from: RingCategory, categories: readonly RingCategory[], ring: Ring): TwoWorlds | null {
  if (ring.legs % 2 === 0) return null;
  const byLeg = new Map(categories.map((c) => [c.leg, c]));
  const half = (ring.legs - 1) / 2;
  const a = byLeg.get((from.leg + half) % ring.legs);
  const b = byLeg.get((from.leg + half + 1) % ring.legs);
  if (!a || !b) return null;
  return { from, facing: [a, b] };
}

export interface Distance {
  from: Entry;
  to: Entry;
  /** Pasos entre las dos. Cero si el archivo no llega a unirlas. */
  steps: number;
  /** null cuando el grafo no las conecta. */
  path: DriftStep[] | null;
}

/**
 * Distancia: las dos entradas más lejanas que el archivo llega a unir.
 *
 * Es el diámetro del grafo, y sirve para medir de un vistazo cuánto se ha
 * cerrado la red. Mientras el archivo era pequeño había entradas que no se
 * tocaban con nada; según crece, el número baja. Cuando el diámetro llegue a
 * dos, cualquier cosa estará a un paso de cualquier otra, la red habrá dejado
 * de tener lejanía que recorrer, y ése será el momento de exigirles más a los
 * vínculos y no menos.
 *
 * Determinista: recorre en el orden del archivo y los empates los decide ese
 * orden, no el azar.
 */
export function longestReach(entries: readonly Entry[]): Distance | null {
  if (entries.length < 2) return null;

  // Una anchura primero por nodo: basta para saber a qué distancia queda cada
  // par, sin reconstruir todavía ninguna ruta.
  const vecinos = new Map(entries.map((e) => [e.id, neighbours(e, entries).map((l) => l.to)]));
  const byId = new Map(entries.map((e) => [e.id, e]));

  let best: { from: Entry; to: Entry; steps: number } | null = null;
  for (const start of entries) {
    const distancia = new Map<string, number>([[start.id, 0]]);
    const cola: string[] = [start.id];
    while (cola.length > 0) {
      const actual = cola.shift() as string;
      const d = distancia.get(actual) ?? 0;
      for (const siguiente of vecinos.get(actual) ?? []) {
        if (distancia.has(siguiente)) continue;
        distancia.set(siguiente, d + 1);
        cola.push(siguiente);
      }
    }
    for (const [id, d] of distancia) {
      if (id === start.id) continue;
      const to = byId.get(id);
      if (!to) continue;
      if (!best || d > best.steps) best = { from: start, to, steps: d };
    }
  }

  // Ni un solo par conectado: el archivo sería polvo suelto.
  if (!best) return { from: entries[0], to: entries[1], steps: 0, path: null };
  return { ...best, path: shortestPath(best.from, best.to, entries) };
}
