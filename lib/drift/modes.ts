import type { Ring } from "../aleph/tension";
import type { RingCategory } from "../content/corpus";
import type { Entry } from "../schema";
import { shortestPath, type DriftStep } from "./graph";

/** Las tres maneras de leer la red. */
export type DriftMode = "deriva" | "dos-mundos" | "contacto";

/**
 * Los dos modos de lectura del grafo que pide la fase 5.
 *
 * Ninguno de los dos resuelve nada: uno devuelve un desajuste y el otro una
 * ruta o su ausencia. Los dos son lecturas del mismo grafo que ya estaba
 * escrito en `graph.ts`.
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

export interface Contact {
  from: Entry;
  to: Entry;
  /** null cuando el grafo no conecta a las dos. */
  path: DriftStep[] | null;
}

/**
 * Contacto: el camino más corto entre una entrada de uno y una del otro.
 *
 * Elige el par más corto que exista, no un par cualquiera: la pregunta no es
 * si estas dos concretas se tocan, sino a qué distancia están los dos archivos
 * que cada uno ha ido escribiendo. Si no hay ninguna ruta, lo dice.
 */
export function contact(
  entries: readonly Entry[],
  a: string,
  b: string,
  seed: string,
): Contact | null {
  const mine = entries.filter((e) => e.contributors.includes(a));
  const yours = entries.filter((e) => e.contributors.includes(b));
  if (mine.length === 0 || yours.length === 0) return null;

  // Determinista: recorre en el orden del archivo y se queda con la más corta.
  // El empate lo rompe el orden de los identificadores, no el azar.
  let best: Contact | null = null;
  for (const from of mine) {
    for (const to of yours) {
      if (from.id === to.id) continue;
      const path = shortestPath(from, to, entries);
      if (!path) continue;
      if (!best || !best.path || path.length < best.path.length) best = { from, to, path };
      if (best.path && best.path.length === 2) return best;
    }
  }
  if (best) return best;

  // Sin ruta: se devuelve el primer par para poder nombrarlo en la interfaz.
  void seed;
  return { from: mine[0], to: yours[0], path: null };
}
