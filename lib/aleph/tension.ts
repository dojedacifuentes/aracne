/**
 * El Aleph cuelga de la red. Cada pata que se apoya tensa un hilo y tira de
 * la esfera hacia su ángulo. La posición de reposo del Aleph es, por tanto,
 * la suma de las tensiones: la esfera *dice* qué has seleccionado sin que
 * haya que leer ninguna etiqueta.
 *
 * Esto es física, no animación. Vive aquí, separado de three.js, para que se
 * pueda probar sin montar una escena. El componente solo lee el resultado.
 */

export interface Ring {
  /** Número de patas. Once. */
  legs: number;
  /** Desplazamiento máximo de la esfera, en radios. */
  reach: number;
}

export const RING: Ring = { legs: 11, reach: 0.34 };

export interface Vec2 {
  x: number;
  y: number;
}

/** Ángulo de una pata. La pata 0 arriba, y el anillo avanza en sentido horario. */
export function legAngle(leg: number, ring: Ring = RING): number {
  return -Math.PI / 2 + (leg * 2 * Math.PI) / ring.legs;
}

export function legVector(leg: number, ring: Ring = RING): Vec2 {
  const a = legAngle(leg, ring);
  return { x: Math.cos(a), y: Math.sin(a) };
}

export interface AlephState {
  /** Posición de reposo, en radios desde el centro. */
  offset: Vec2;
  /** Cuánto se ha alejado del centro, de 0 a 1. */
  strain: number;
  /** Inclinación del eje de giro, en radianes. */
  tilt: number;
  /** Distorsión del material. Más patas, menos legible la esfera. */
  distortion: number;
  /** Velocidad de giro, rad/s. */
  spin: number;
}

const BASE_DISTORTION = 0.3;
const BASE_SPIN = 0.06;

/**
 * Estado de reposo para una selección de patas.
 *
 * Propiedad del anillo impar que conviene conocer: la suma de los once
 * vectores unitarios es cero exacto. Apoyar las once patas devuelve el Aleph
 * al centro perfecto, y es la única selección que lo consigue — cualquier
 * otra lo deja descentrado. Dos patas casi opuestas no se cancelan nunca,
 * porque en once no hay opuestas.
 */
export function alephState(legs: number[], ring: Ring = RING): AlephState {
  let x = 0;
  let y = 0;
  for (const leg of legs) {
    const v = legVector(leg, ring);
    x += v.x;
    y += v.y;
  }

  // La tensión se reparte: apoyar muchas patas no multiplica el tirón.
  const n = Math.max(1, legs.length);
  const pull = Math.hypot(x, y) / Math.sqrt(n);
  const scale = pull > 0 ? (ring.reach * Math.min(1, pull)) / Math.hypot(x, y) : 0;

  const offset = { x: x * scale, y: y * scale };
  const strain = Math.min(1, Math.hypot(offset.x, offset.y) / ring.reach);

  return {
    offset,
    strain,
    tilt: strain * 0.22,
    distortion: Math.min(0.85, BASE_DISTORTION + legs.length * 0.045),
    spin: BASE_SPIN * (1 + strain * 0.8),
  };
}

/**
 * Golpe transitorio al apoyar o soltar una pata. El componente lo suma a la
 * posición y deja que el muelle lo absorba.
 *
 *   apoyar  → tirón hacia la pata
 *   soltar  → retroceso hacia el lado contrario, más débil
 */
export function impulse(leg: number, action: "apoyar" | "soltar", ring: Ring = RING): Vec2 {
  const v = legVector(leg, ring);
  const k = action === "apoyar" ? 0.16 : -0.09;
  return { x: v.x * k, y: v.y * k };
}

/**
 * Cada hilo vibra a su propia frecuencia, ordenada alrededor del anillo. Dos
 * patas vecinas suenan parecido; dos lejanas, no. Es la misma información que
 * da la distancia angular, por otro canal.
 */
export function threadFrequency(leg: number, ring: Ring = RING): number {
  return 5.5 + (leg / ring.legs) * 7;
}

/** Muelle crítico-amortiguado. dt en segundos. */
export function spring(
  current: Vec2,
  velocity: Vec2,
  target: Vec2,
  dt: number,
  stiffness = 90,
  damping = 14,
): { position: Vec2; velocity: Vec2 } {
  const step = Math.min(dt, 1 / 30);
  const ax = (target.x - current.x) * stiffness - velocity.x * damping;
  const ay = (target.y - current.y) * stiffness - velocity.y * damping;
  const vx = velocity.x + ax * step;
  const vy = velocity.y + ay * step;
  return {
    position: { x: current.x + vx * step, y: current.y + vy * step },
    velocity: { x: vx, y: vy },
  };
}

/**
 * Sin movimiento: el Aleph salta directamente a su posición de reposo, sin
 * muelle ni golpe. La posición sigue codificando la selección, que es lo que
 * importa; lo que desaparece es el recorrido.
 */
export function reducedMotionState(legs: number[], ring: Ring = RING): AlephState {
  const s = alephState(legs, ring);
  return { ...s, spin: 0 };
}
