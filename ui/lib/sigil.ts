import { rngFromString } from '../../lib/oracle/rng';

/**
 * Los sellos.
 *
 * Cada pata y cada botón llevan una marca geométrica. No es adorno esotérico:
 * es el mismo vocabulario que ya usa el archivo —un anillo y unas cuerdas que
 * lo cruzan— reducido a cuarenta píxeles.
 *
 * La segunda versión cambia el marco: antes todos los sellos iban dentro del
 * **mismo círculo**, así que a tamaño de icono los once se parecían a once
 * medallas iguales con un glifo distinto dentro. Ahora el marco es un
 * **polígono de k lados**, y k cambia de pata en pata: a un vistazo se
 * distinguen el triángulo, el cuadrado, el pentágono, el hexágono y el
 * heptágono aunque el glifo no se llegue a leer. Dentro va la estrella {k/2},
 * y en cada vértice un remate, que es lo que hace que parezca grabado y no
 * autoformas.
 *
 * Todo se calcula, nada se dibuja a mano: una pata nueva tiene su sello el día
 * que entra. Y todo es determinista —sin `Math.random`, como manda
 * CLAUDE.md—, así que la misma pata lleva siempre el mismo sello.
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
  /** El marco: un polígono de `folds` lados. */
  frame: Point[];
  /** La estrella interior. Polilíneas cerradas, coordenadas 0..1. */
  star: Point[][];
  /** Remates en los vértices del marco. */
  studs: Point[];
}

/** Arriba, como la pata 0 del anillo. */
const PHASE = -Math.PI / 2;

const MIN_FOLDS = 3;
const FOLD_RANGE = 5;

/** Radio del marco. Deja un pelo de aire dentro de su caja. */
const FRAME_R = 0.46;
/** Radio de la estrella. Por debajo del marco, para que no lo toque. */
const STAR_R = 0.33;

const vertices = (folds: number, radius: number, phase: number): Point[] =>
  Array.from({ length: folds }, (_, i) => {
    const angle = phase + (i * 2 * Math.PI) / folds;
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
  });

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
 * que la estrella se cruce consigo misma; por debajo, el polígono simple
 * girado media vuelta de sector, que da la estrella de seis puntas.
 */
export function sigil(folds: number): Sigil {
  const k = Math.max(MIN_FOLDS, Math.round(folds));
  const step = k >= 5 ? 2 : 1;
  const phase = k >= 5 ? PHASE : PHASE + Math.PI / k;
  return {
    folds: k,
    step,
    frame: vertices(k, FRAME_R, PHASE),
    star: cycles(k, step, STAR_R, phase),
    studs: vertices(k, FRAME_R, PHASE),
  };
}

/**
 * El sello de una pata. Los ejes salen de su posición en el anillo, así que
 * dependen del orden —que es afinidad— y no de su nombre: patas vecinas llevan
 * marcos distintos y el anillo entero recorre las cinco formas.
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
