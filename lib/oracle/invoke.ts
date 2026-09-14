import type { Entry } from "../schema";
import { rngFromString, type Rng } from "./rng";
import { pickWeighted, weightOf, type Mode } from "./weighted";
import { neighbours } from "../drift/graph";

/**
 * La araña apoya patas. Cada pata es una categoría.
 *
 * Una pata   → una entrada.
 * Dos patas  → una arista: dos entradas y el puente entre ellas.
 * Tres o más → una constelación.
 * Ninguna    → la araña elige, y a veces deriva.
 *
 * La misma selección no da siempre lo mismo porque la semilla cambia en cada
 * pulsación, pero la semilla viaja en la URL: el resultado es irrepetible y
 * recuperable a la vez.
 */

export type Shape = "entrada" | "arista" | "constelacion" | "deriva";

export interface Bridge {
  kind: "tag" | "categoria" | "autor" | "tipo" | "explicita" | "ninguno";
  label: string;
}

export interface Invocation {
  seed: string;
  legs: string[];
  shape: Shape;
  entries: Entry[];
  bridge: Bridge;
  /** Lo que separa a las entradas. Tan informativo como lo que las une. */
  fault: string | null;
  dictum: string;
}

const SHAPE_ODDS: Record<number, [Shape, number][]> = {
  0: [["entrada", 5], ["arista", 3], ["constelacion", 1], ["deriva", 2]],
  1: [["entrada", 6], ["arista", 3], ["deriva", 2]],
  2: [["arista", 7], ["constelacion", 2], ["entrada", 1]],
  3: [["constelacion", 7], ["arista", 3]],
};

function rollShape(legCount: number, rng: Rng): Shape {
  const table = SHAPE_ODDS[Math.min(legCount, 3)];
  return pickWeighted(table, ([, w]) => w, rng)![0];
}

function poolFor(corpus: Entry[], legs: string[]): Entry[] {
  if (legs.length === 0) return corpus;
  const hit = corpus.filter((e) => legs.some((l) => e.categories.includes(l)));
  return hit.length > 0 ? hit : corpus;
}

/** Prefiere entradas que tocan varias de las patas apoyadas. */
function legAffinity(entry: Entry, legs: string[]): number {
  if (legs.length === 0) return 1;
  const touched = legs.filter((l) => entry.categories.includes(l)).length;
  return 1 + touched * touched;
}

/**
 * El puente siempre nombra algo concreto —un tag, una categoría, un autor—
 * porque las plantillas lo insertan en mitad de una frase. La relación
 * explícita marca el vínculo pero no sustituye a la etiqueta.
 */
function bridgeBetween(a: Entry, b: Entry): Bridge {
  const explicit = a.related.includes(b.id) || b.related.includes(a.id);

  const tag = a.tags.find((t) => b.tags.includes(t));
  if (tag) return { kind: explicit ? "explicita" : "tag", label: tag };

  const cat = a.categories.find((c) => b.categories.includes(c));
  if (cat) return { kind: explicit ? "explicita" : "categoria", label: cat };

  const authorsA = a.sources.map((s) => s.author).filter(Boolean) as string[];
  const author = authorsA.find((x) => b.sources.some((s) => s.author === x));
  if (author) return { kind: explicit ? "explicita" : "autor", label: author };

  if (explicit) return { kind: "explicita", label: "un vínculo anotado a mano" };
  if (a.type === b.type) return { kind: "tipo", label: a.type };
  return { kind: "ninguno", label: "" };
}

const STATUS_ES: Record<string, string> = {
  fact: "hecho", hypothesis: "hipótesis", fiction: "ficción",
  speculation: "especulación", interpretation: "interpretación",
  controversial: "disputado", unverified: "sin verificar",
};

/** Lo que las separa. Nunca inventa: solo compara metadatos reales. */
function faultBetween(a: Entry, b: Entry): string | null {
  if (a.epistemicStatus !== b.epistemicStatus) {
    return `una es ${STATUS_ES[a.epistemicStatus]}, la otra ${STATUS_ES[b.epistemicStatus]}`;
  }
  const ya = a.sources.find((s) => s.year)?.year;
  const yb = b.sources.find((s) => s.year)?.year;
  if (ya && yb && Math.abs(ya - yb) > 80) {
    return `${Math.abs(ya - yb)} años entre una y otra`;
  }
  const d = Math.abs(a.scores.darkness - b.scores.darkness);
  if (d >= 3) return "una es mucho más oscura que la otra";
  if (a.type !== b.type) return `una es ${a.type}, la otra ${b.type}`;
  return null;
}

/**
 * Los dictámenes no afirman nada sobre el mundo. Son instrucciones de lectura:
 * señalan dónde mirar, no qué concluir. Ninguna plantilla puede producir una
 * frase que alguien pueda citar como hecho.
 */
const FRAMES_PAIR = [
  "Entre {A} y {B} hay un solo paso. No es el que esperas.",
  "{A} no explica {B}. Las dos explican otra cosa.",
  "Comparten {P}. Eso es más raro de lo que parece.",
  "Si {A} es cierta, ¿qué le pasa a {B}?",
  "Alguien tuvo las dos ideas y no lo dijo.",
  "Léelas en el orden contrario.",
  "{P} es el hilo. Tira despacio.",
  "Una de las dos sobra. Decide cuál y observa qué pierdes.",
  "No hay tradición que las junte. Por eso están aquí.",
];

const FRAMES_SINGLE = [
  "Esto llevaba tiempo esperando en el archivo.",
  "No busques con qué relacionarlo todavía.",
  "Vuelve a esto dentro de una semana y comprueba si dice lo mismo.",
  "La pregunta importa más que la entrada.",
  "Alguien la aportó por una razón que no escribió.",
];

const FRAMES_CONSTELLATION = [
  "Tres puntos definen un plano. Estos tres, no.",
  "{P} aparece en las tres. Puede ser una coincidencia del archivo.",
  "Una de estas tres no debería estar aquí. El archivo no sabe cuál.",
  "Léelas como si fueran capítulos de un mismo libro perdido.",
];

function fill(frame: string, entries: Entry[], bridge: Bridge): string {
  return frame
    .replace("{A}", entries[0]?.title ?? "")
    .replace("{B}", entries[1]?.title ?? "")
    .replace("{P}", bridge.label);
}

export function invoke(
  corpus: Entry[],
  seed: string,
  legs: string[] = [],
  opts: { mode?: Mode; history?: string[] } = {},
): Invocation | null {
  const mode = opts.mode ?? "normal";
  const sorted = [...legs].sort();
  const rng = rngFromString(`${seed}|${sorted.join(",")}|${mode}`);
  const excluded = new Set((opts.history ?? []).slice(0, 4));

  const pool = poolFor(corpus, sorted);
  if (pool.length === 0) return null;

  const shape = rollShape(sorted.length, rng);
  const want = shape === "entrada" ? 1 : shape === "arista" ? 2 : shape === "deriva" ? 1 : 3;

  const chosen: Entry[] = [];
  const taken = new Set<string>();

  while (chosen.length < want) {
    const candidates = pool.filter(
      (e) => !taken.has(e.id) && (chosen.length > 0 || !excluded.has(e.id)),
    );
    if (candidates.length === 0) break;

    // Tras la primera, se prefiere lo que ya está conectado: la red antes
    // que el azar puro.
    const anchor = chosen[chosen.length - 1];
    const related = anchor
      ? new Map(neighbours(anchor, candidates).map((l) => [l.to, l.score]))
      : null;

    const pick = pickWeighted(
      candidates,
      (e) =>
        weightOf(e, mode) *
        legAffinity(e, sorted) *
        (related ? 1 + (related.get(e.id) ?? 0) / 4 : 1),
      rng,
    );
    if (!pick) break;
    chosen.push(pick);
    taken.add(pick.id);
  }

  if (chosen.length === 0) return null;

  const bridge =
    chosen.length > 1
      ? bridgeBetween(chosen[0], chosen[1])
      : { kind: "ninguno" as const, label: chosen[0].tags[0] ?? "" };
  const fault = chosen.length > 1 ? faultBetween(chosen[0], chosen[1]) : null;

  const frames =
    chosen.length === 1
      ? FRAMES_SINGLE
      : chosen.length === 2
        ? FRAMES_PAIR
        : FRAMES_CONSTELLATION;
  // Sin etiqueta concreta no se pueden usar las plantillas que la insertan.
  const usable = bridge.label ? frames : frames.filter((f) => !f.includes("{P}"));
  const frame = usable[Math.floor(rng() * usable.length)];

  return {
    seed,
    legs: sorted,
    shape,
    entries: chosen,
    bridge,
    fault,
    dictum: fill(frame, chosen, bridge),
  };
}
