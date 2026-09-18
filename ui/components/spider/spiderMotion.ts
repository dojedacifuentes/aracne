import type { Vec2 } from '../../../lib/aleph/tension';
import { GRIP, MOTION, SCENE } from './spiderConfig';

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
 * Cuánto mide el objetivo que se pulsa: la envergadura del animal con algo de
 * margen, porque las patas tiran del cuerpo y hay que poder cogerlo donde
 * quede.
 *
 * **Sin medida del escenario devuelve el mínimo, nunca cero.** La medida llega
 * por `onLayout`, que en web es un `ResizeObserver`, y un `ResizeObserver` no
 * entrega nada donde no se repinta: una pestaña de fondo, un panel oculto, una
 * captura. Si el objetivo esperase a esa medida, en esos sitios no habría
 * botón —ni para el ratón, ni para el teclado, ni para un lector de pantalla—.
 * Es la misma regla que el plazo de la araña: la animación puede faltar, lo
 * que se toca no.
 */
export function hitSize(box: { width: number; height: number }, scale: number): number {
  const span = Math.min(box.width, box.height) * SCENE.span * scale;
  return Math.max(GRIP.minHit, span * 1.3);
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

/**
 * Resistencia al tirar:  f(d) = d·R / (d + R).
 *
 * En el origen vale exactamente lo que se tira (f′(0) = 1), a media distancia
 * ya solo la mitad y por mucho que se siga tirando nunca llega a `reach`. Es
 * una seda y no un carril: el cuerpo sigue a la mano de cerca al principio y
 * se resiste cada vez más según se lo lleva lejos.
 */
export function resist(distance: number, reach: number): number {
  if (!(reach > 0)) return 0;
  const d = Math.max(0, distance);
  return (d * reach) / (d + reach);
}

/** La misma curva sobre un vector: cambia el módulo y respeta la dirección. */
export function resistInPlace(out: Vec2, dx: number, dy: number, reach: number): Vec2 {
  const d = Math.hypot(dx, dy);
  if (d < 1e-9 || !(reach > 0)) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const k = resist(d, reach) / d;
  out.x = dx * k;
  out.y = dy * k;
  return out;
}

/**
 * Recorta una velocidad sin torcerla. Al soltar, el golpe hereda el gesto pero
 * no lo obedece: la araña cuelga de un hilo y no se puede lanzar fuera.
 */
export function clampSpeed(out: Vec2, vx: number, vy: number, max: number): Vec2 {
  const speed = Math.hypot(vx, vy);
  const k = speed > max && speed > 0 ? max / speed : 1;
  out.x = vx * k;
  out.y = vy * k;
  return out;
}

/** Lo que se sabe de la mano: dónde estaba, cuándo, y a qué velocidad iba. */
export interface PointerTrack {
  x: number;
  y: number;
  /** Instante de la última muestra, en milisegundos. */
  t: number;
  vx: number;
  vy: number;
}

export function trackStart(track: PointerTrack, x: number, y: number, t: number): PointerTrack {
  track.x = x;
  track.y = y;
  track.t = t;
  track.vx = 0;
  track.vy = 0;
  return track;
}

/**
 * Una muestra más. El intervalo se acota por abajo —dos eventos en el mismo
 * milisegundo darían una velocidad absurda— y por arriba —un fotograma perdido
 * no debe leerse como una mano lenta—, y la medida se mezcla con la anterior
 * para que el último temblor no decida el golpe. Es la parte de MOMO que vale:
 * saber *a qué velocidad* se suelta, no solo dónde.
 */
export function trackMove(track: PointerTrack, x: number, y: number, t: number): PointerTrack {
  const dt = Math.min(GRIP.sampleMaxMs, Math.max(GRIP.sampleMinMs, t - track.t)) / 1000;
  const vx = (x - track.x) / dt;
  const vy = (y - track.y) / dt;
  track.vx += (vx - track.vx) * GRIP.sampleBlend;
  track.vy += (vy - track.vy) * GRIP.sampleBlend;
  track.x = x;
  track.y = y;
  track.t = t;
  return track;
}

/**
 * La velocidad en el momento de soltar. Si la mano se paró antes de levantarse
 * —sujetar quieto y soltar—, la última medida ya no vale: se apaga con el
 * tiempo transcurrido, así que soltar parado no lanza nada.
 */
export function trackSpeed(out: Vec2, track: PointerTrack, t: number): Vec2 {
  const decay = Math.exp(-Math.max(0, t - track.t) / GRIP.staleMs);
  out.x = track.vx * decay;
  out.y = track.vy * decay;
  return out;
}
