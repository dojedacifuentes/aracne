import { legAngle, type Ring } from "../aleph/tension";
import type { RingCategory } from "../content/corpus";
import { rngFromString } from "../oracle/rng";
import type { Entry } from "../schema";
import { neighbours, WEIGHTS, type LinkReason } from "./graph";

/**
 * Dónde se dibuja cada entrada.
 *
 * No es un grafo de fuerzas. Un layout de fuerzas produce una bola de pelos en
 * la que la posición no significa nada, y aquí la posición **tiene** que
 * significar algo: el anillo de once patas ya ordena las categorías por
 * afinidad, así que cada entrada se coloca en el ángulo de su categoría. Dos
 * entradas vecinas en el anillo caen cerca; una arista que cruza el centro es,
 * literalmente, un cruce improbable. Eso es lo que el archivo quiere enseñar.
 *
 * Todo es determinista: la misma semilla dibuja la misma tela. Sin
 * `Math.random`, como manda CLAUDE.md.
 */

export interface Node {
  id: string;
  title: string;
  /** 0..1, con el centro en (0.5, 0.5). */
  x: number;
  y: number;
  /** Vecinos que tiene, para el tamaño del punto. */
  degree: number;
  /** Pata que lo ancla, o null si su categoría no está en el anillo. */
  leg: number | null;
  unverified: boolean;
}

export interface Edge {
  from: string;
  to: string;
  reason: LinkReason;
  label: string;
  /** 0..1, normalizado sobre el vínculo más fuerte posible. */
  weight: number;
  /** Patas que separan a los dos extremos, medido sobre el anillo. */
  span: number;
}

export interface Web {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Referencia para normalizar: una razón de cada tipo a la vez.
 *
 * No es un máximo real. `scoreLink` suma una vez por cada coincidencia, así
 * que dos entradas que comparten tres tags ya se pasan de aquí. Por eso el
 * peso se acota en uno: por encima de esta referencia, más fuerte es más
 * fuerte y el dibujo no necesita distinguirlo.
 */
const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

/**
 * Distancia entre dos patas sobre un anillo: nunca más de la mitad. En once,
 * el máximo es cinco, y cinco es el cruce más lejano que el archivo permite.
 */
export function ringDistance(a: number, b: number, legs: number): number {
  const d = Math.abs(a - b) % legs;
  return Math.min(d, legs - d);
}

/**
 * Sitúa las entradas y devuelve las aristas que merecen dibujarse.
 *
 * `minWeight` recorta: con el archivo entero y todas las aristas, el dibujo se
 * vuelve ilegible mucho antes de volverse informativo.
 */
export function buildWeb(
  entries: readonly Entry[],
  categories: readonly RingCategory[],
  seed: string,
  ring: Ring,
  minWeight = 0.25,
): Web {
  const legOf = new Map(categories.map((c) => [c.id, c.leg]));
  const rng = rngFromString(`tela:${seed}`);

  // Cuántas entradas ancla cada pata: sirve para repartirlas en su sector sin
  // que se amontonen todas en el mismo punto.
  const perLeg = new Map<number, number>();
  const anchors = entries.map((entry) => {
    const leg = entry.categories.map((c) => legOf.get(c)).find((l) => l !== undefined) ?? null;
    if (leg !== null) perLeg.set(leg, (perLeg.get(leg) ?? 0) + 1);
    return { entry, leg };
  });

  const seen = new Map<number, number>();
  const nodes: Node[] = anchors.map(({ entry, leg }) => {
    const degree = neighbours(entry, entries).length;
    if (leg === null) {
      // Sin pata en el anillo: al centro, que es donde no pertenece a nada.
      return { id: entry.id, title: entry.title, x: 0.5, y: 0.5, degree, leg, unverified: entry.epistemicStatus === "unverified" };
    }
    const index = seen.get(leg) ?? 0;
    seen.set(leg, index + 1);
    const total = perLeg.get(leg) ?? 1;

    // Abanico dentro del sector de la pata, y radio escalonado para que dos
    // entradas de la misma categoría no se tapen.
    const spread = (Math.PI / ring.legs) * 0.82;
    const offset = total === 1 ? 0 : (index / (total - 1) - 0.5) * 2 * spread;
    const angle = legAngle(leg, ring) + offset;
    const radius = 0.2 + 0.24 * ((index + 0.5) / total) + rng() * 0.05;

    return {
      id: entry.id,
      title: entry.title,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      degree,
      leg,
      unverified: entry.epistemicStatus === "unverified",
    };
  });

  const legById = new Map(nodes.map((n) => [n.id, n.leg]));
  const edges: Edge[] = [];
  const hecho = new Set<string>();
  for (const entry of entries) {
    for (const link of neighbours(entry, entries)) {
      const key = entry.id < link.to ? `${entry.id}|${link.to}` : `${link.to}|${entry.id}`;
      if (hecho.has(key)) continue;
      hecho.add(key);
      const weight = Math.min(1, link.score / MAX_SCORE);
      if (weight < minWeight) continue;
      const a = legById.get(entry.id);
      const b = legById.get(link.to);
      edges.push({
        from: entry.id,
        to: link.to,
        reason: link.reason,
        label: link.label,
        weight,
        span: a === null || b === null || a === undefined || b === undefined ? 0 : ringDistance(a, b, ring.legs),
      });
    }
  }

  // Las más fuertes al final: se dibujan encima.
  edges.sort((x, y) => x.weight - y.weight);
  return { nodes, edges };
}

export interface Vertex {
  x: number;
  y: number;
}

/**
 * La rejilla sobre la que se quiebran las trazas. No la usan los nodos —su
 * sitio lo manda la pata y eso no se toca—, solo los codos: que todos los
 * giros caigan en las mismas líneas es lo que hace que veinte hilos sueltos
 * se lean como un circuito y no como veinte hilos sueltos.
 */
export const TRACE_GRID = 1 / 22;

const snap = (v: number) => Math.round(v / TRACE_GRID) * TRACE_GRID;

/**
 * La traza entre dos entradas, en ángulo recto.
 *
 * Sale del punto, corre por un canal propio y entra en el otro: tres tramos y
 * dos codos, como una pista de placa. El canal se elige con el PRNG sembrado a
 * partir de los dos extremos, así que la misma pareja se encamina siempre
 * igual —una traza que cambiara de recorrido en cada visita no sería un mapa—
 * y dos trazas vecinas rara vez se solapan.
 *
 * Los extremos no se llevan a la rejilla: los codos sí. La posición de una
 * entrada la sigue mandando su categoría.
 */
export function traceRoute(from: Vertex, to: Vertex, key: string): Vertex[] {
  const rng = rngFromString(`traza:${key}`);
  const lane = (Math.floor(rng() * 5) - 2) * TRACE_GRID;
  const horizontal = rng() < 0.5;

  if (horizontal) {
    const x = snap((from.x + to.x) / 2 + lane);
    return [from, { x, y: from.y }, { x, y: to.y }, to];
  }
  const y = snap((from.y + to.y) / 2 + lane);
  return [from, { x: from.x, y }, { x: to.x, y }, to];
}

/** Longitud de una polilínea, para repartir lo que viaje por encima. */
export function routeLength(route: readonly Vertex[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    total += Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].y - route[i - 1].y);
  }
  return total;
}

/**
 * Dónde está, en 0..1, algo que recorre la traza. Fuera de ese rango se
 * devuelve el extremo: nada se sale nunca de la pista.
 */
export function pointOnRoute(route: readonly Vertex[], t: number): Vertex {
  if (t <= 0) return route[0];
  if (t >= 1) return route[route.length - 1];
  const total = routeLength(route);
  if (total === 0) return route[0];
  let left = t * total;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    const step = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (step === 0) continue;
    if (left <= step) {
      const k = left / step;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= step;
  }
  return route[route.length - 1];
}

/** Las aristas que cruzan de un lado al otro del anillo: los cruces raros. */
export function farCrossings(web: Web, ring: Ring): Edge[] {
  const far = Math.floor(ring.legs / 2);
  return web.edges.filter((e) => e.span >= far - 1).sort((a, b) => b.span - a.span || b.weight - a.weight);
}
