import { MOTION } from './spiderConfig';

/**
 * El movimiento de la araña, sin three.js y sin reservar memoria por
 * fotograma: cada función escribe en un objeto que se reutiliza. Se prueba sin
 * montar una escena, igual que lib/aleph/tension.ts.
 */

export interface Damped {
  value: number;
  velocity: number;
}

/**
 * Muelle crítico (el SmoothDamp de siempre): llega sin rebotar, frena al final
 * y no depende del framerate. Es la curva del descenso por el hilo.
 */
export function smoothDamp(state: Damped, target: number, smoothTime: number, dt: number): Damped {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.value - target;
  const temp = (state.velocity + omega * change) * dt;
  state.velocity = (state.velocity - omega * temp) * decay;
  state.value = target + (change + temp) * decay;
  return state;
}

export interface Spring2 {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * El mismo integrador y las mismas constantes que `spring()` de
 * lib/aleph/tension.ts, pero escribiendo en su sitio. Un test comprueba que
 * los dos dan exactamente lo mismo, fotograma a fotograma.
 */
export function springInPlace(
  state: Spring2,
  targetX: number,
  targetY: number,
  dt: number,
  stiffness = 90,
  damping = 14,
): Spring2 {
  const step = Math.min(dt, 1 / 30);
  const ax = (targetX - state.x) * stiffness - state.vx * damping;
  const ay = (targetY - state.y) * stiffness - state.vy * damping;
  state.vx += ax * step;
  state.vy += ay * step;
  state.x += state.vx * step;
  state.y += state.vy * step;
  return state;
}

export interface Ambient {
  /** Ángulo del péndulo alrededor del anclaje del hilo. */
  sway: number;
  /** Elasticidad vertical, en fracciones de envergadura. */
  bob: number;
  /** Torsión alrededor del hilo. */
  twist: number;
  /** Vaivén de la seda, en fracción de su longitud. */
  silkX: number;
  silkZ: number;
}

export function stillAmbient(out: Ambient): Ambient {
  out.sway = 0;
  out.bob = 0;
  out.twist = 0;
  out.silkX = 0;
  out.silkZ = 0;
  return out;
}

/**
 * Micro movimiento en el instante t. El péndulo mezcla dos senos de periodos
 * inconmensurables, así que nunca repite el mismo recorrido.
 */
export function ambientAt(t: number, intensity: number, speed: number, out: Ambient): Ambient {
  const k = Math.max(0, intensity);
  const s = Math.max(0, speed) * t;
  out.sway =
    k *
    MOTION.swayAngle *
    (0.7 * Math.sin(s * MOTION.swayFrequency) + 0.3 * Math.sin(s * MOTION.swayFrequency * 1.618 + 0.9));
  out.bob = k * MOTION.bob * Math.sin(s * MOTION.bobFrequency + 1.3);
  out.twist = k * MOTION.twist * Math.sin(s * MOTION.twistFrequency);
  out.silkX = k * MOTION.silkSway * Math.sin(s * MOTION.silkSwayX);
  out.silkZ = k * MOTION.silkSway * 0.6 * Math.cos(s * MOTION.silkSwayZ);
  return out;
}

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/**
 * Gesto de pupila: se contrae rápido y vuelve despacio, sin rebote.
 * `progress` va de 0 a 1; fuera de ese tramo la escala es 1.
 */
export function pupil(progress: number, contracted: number = MOTION.pressScale): number {
  if (progress <= 0 || progress >= 1) return 1;
  const k = progress < 0.4 ? easeOutCubic(progress / 0.4) : 1 - easeInOutSine((progress - 0.4) / 0.6);
  return 1 - (1 - contracted) * k;
}
