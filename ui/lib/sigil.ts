import { rngFromString } from '../../lib/oracle/rng';

/**
 * Los sellos.
 *
 * Cada pata y cada botón llevan una marca geométrica: un polígono estrellado
 * inscrito en una circunferencia. No es adorno esotérico: es el mismo
 * vocabulario que ya usa el archivo —un anillo y unas cuerdas que lo cruzan—
 * reducido a veintiocho píxeles. Una marca con k ejes de simetría se reconoce
 * de un vistazo y se distingue de otra con k+1 sin tener que leer nada.
 *
 * Todo se calcula, nada se dibuja a mano: así una pata nueva tiene su sello el
 * día que entra, sin que nadie abra un editor. Y todo es determinista —sin
 * `Math.random`, como manda CLAUDE.md—, de modo que la misma pata lleva
 * siempre el mismo sello.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Sigil {
  /** Ejes de simetría: el dibujo se repite al girar 2π/folds. */
  folds: number;
  /** Salto del polígono estrellado {folds/step}. */
  step: number;
  /** Circunferencias concéntricas, en radios de 0 a 0.5. */
  rings: number[];
  /** El exterior: la estrella. Polilíneas cerradas, coordenadas 0..1. */
  star: Point[][];
  /** El interior: un polígono girado media vuelta de sector. */
  core: Point[][];
}

/** Arriba, como la pata 0 del anillo. */
const PHASE = -Math.PI / 2;

const MIN_FOLDS = 3;
const FOLD_RANGE = 5;

/**
 * Los vértices de {folds/step}, en ciclos. Cuando el salto y el número de
 * vértices no son primos entre sí, la estrella se parte en varias piezas —el
 * hexagrama son dos triángulos— y cada pieza sale en su propia polilínea.
 */
function cycles(folds: number, step: number, radius: number, phase: number): Point[][] {
  const out: Point[][] = [];
  const visited = new Set<number>();
  for (let start = 0; start < folds; start += 1) {
    if (visited.has(start)) continue;
    const cycle: Point[] = [];
    let i = start;
    do {
      visited.add(i);
      const angle = phase + (i * 2 * Math.PI) / folds;
      cycle.push({ x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius });
      i = (i + step) % folds;
    } while (i !== start);
    out.push(cycle);
  }
  return out;
}

/**
 * Un sello de k ejes. El salto es dos en cuanto hay vértices suficientes para
 * que la estrella se cruce consigo misma; por debajo, el polígono simple.
 */
export function sigil(folds: number): Sigil {
  const k = Math.max(MIN_FOLDS, Math.round(folds));
  const step = k >= 5 ? 2 : 1;
  return {
    folds: k,
    step,
    rings: [0.47],
    star: cycles(k, step, 0.4, PHASE),
    // Girado medio sector: el interior nunca se apoya en los mismos radios que
    // la estrella, y el sello se lee como dos figuras y no como una sola sucia.
    core: cycles(k, 1, 0.17, PHASE + Math.PI / k),
  };
}

/**
 * El sello de una pata. Los ejes salen de su posición en el anillo, así que
 * dependen del orden —que es afinidad— y no de su nombre: patas vecinas llevan
 * sellos distintos y el anillo entero recorre las cinco formas.
 */
export function legSigil(leg: number): Sigil {
  return sigil(MIN_FOLDS + (((leg % FOLD_RANGE) + FOLD_RANGE) % FOLD_RANGE));
}

/**
 * El sello de un botón. Se deriva de su etiqueta por el PRNG sembrado, que es
 * la única fuente de azar que este proyecto admite: `invocar` lleva siempre la
 * misma marca, aquí y en la siguiente sesión.
 */
export function markSigil(key: string): Sigil {
  return sigil(MIN_FOLDS + Math.floor(rngFromString(`sello:${key}`)() * FOLD_RANGE));
}
