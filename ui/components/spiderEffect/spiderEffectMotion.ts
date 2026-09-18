import { rngFromString, type Rng } from '../../../lib/oracle/rng';
import type { EntityConfig } from './spiderEffectConfig';

/**
 * La aritmética de la entidad: dónde está, cómo alcanza al cursor, cuándo se
 * mueve sola, dónde apoya los pies y cómo cuelga un hilo. Sin DOM y sin
 * React, así que se prueba sin navegador; el componente solo la llama y
 * dibuja lo que sale.
 *
 * Nada se reserva por fotograma: los vectores viven en el estado y las
 * funciones escriben en un `out` que se les pasa.
 *
 * Toda la aleatoriedad sale del PRNG sembrado del archivo (CLAUDE.md, regla 3):
 * la tela y los gestos son los mismos en cualquier máquina.
 */

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TAU = Math.PI * 2;

export const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2);

/** La diferencia más corta entre dos ángulos, en (−π, π]. */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  else if (delta <= -Math.PI) delta += TAU;
  return delta;
}

/** Una semilla entera de 32 bits a partir de un texto, por el PRNG del archivo. */
export function seedToInt(seed: string): number {
  return Math.floor(rngFromString(seed)() * 0x100000000) | 0;
}

/** Dos enteros y una semilla → un número en [0, 1). Sin estado: el mismo punto da siempre lo mismo. */
export function hash01(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

/**
 * El punto de apoyo más cercano a (x, y) en la malla invisible. Cada celda
 * tiene uno, desplazado dentro de ella por el hash, así que los pies caen
 * siempre en los mismos sitios: la tela estaba ahí antes que ella.
 */
export function foothold(x: number, y: number, grid: number, seed: number, out: Vec): Vec {
  const ix = Math.round(x / grid);
  const iy = Math.round(y / grid);
  let best = Infinity;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cx = ix + dx;
      const cy = iy + dy;
      const px = (cx + (hash01(cx, cy, seed) - 0.5) * 0.7) * grid;
      const py = (cy + (hash01(cx, cy, seed ^ 0x5bd1e995) - 0.5) * 0.7) * grid;
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) {
        best = d;
        out.x = px;
        out.y = py;
      }
    }
  }
  return out;
}

/**
 * Las anclas de la tela: `count` puntos repartidos por la ventana. Muestreo
 * estratificado —una celda por ancla y un sitio al azar dentro— para que no
 * haya ni grumos ni huecos, y la misma semilla con la misma ventana da la
 * misma tela.
 */
export function scatterAnchors(count: number, width: number, height: number, seed: string): Float32Array {
  const out = new Float32Array(Math.max(0, count) * 2);
  if (count <= 0 || width <= 0 || height <= 0) return out;
  const rng = rngFromString(`${seed}|tela|${Math.round(width)}x${Math.round(height)}`);
  const cols = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellW = width / cols;
  const cellH = height / rows;
  // Las celdas se recorren barajadas: si sobran, el hueco no cae siempre en la última fila.
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = cells[i];
    cells[i] = cells[j];
    cells[j] = swap;
  }
  for (let k = 0; k < count; k += 1) {
    const cell = cells[k % cells.length];
    out[2 * k] = ((cell % cols) + 0.12 + 0.76 * rng()) * cellW;
    out[2 * k + 1] = (Math.floor(cell / cols) + 0.12 + 0.76 * rng()) * cellH;
  }
  return out;
}

/**
 * Qué anclas se unen: las parejas más cortas por debajo de `maxDistance`, y
 * como mucho `perAnchor` hilos por ancla. Una tela, no una maraña. Se calcula
 * una vez por tamaño de ventana; devuelve los índices en pares.
 */
export function linkAnchors(anchors: Float32Array, maxDistance: number, perAnchor = 3): Uint16Array {
  const n = anchors.length / 2;
  const candidates: { i: number; j: number; d: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = Math.hypot(anchors[2 * j] - anchors[2 * i], anchors[2 * j + 1] - anchors[2 * i + 1]);
      if (d <= maxDistance) candidates.push({ i, j, d });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  const degree = new Uint8Array(n);
  const pairs: number[] = [];
  for (const { i, j } of candidates) {
    if (degree[i] >= perAnchor || degree[j] >= perAnchor) continue;
    degree[i] += 1;
    degree[j] += 1;
    pairs.push(i, j);
  }
  return Uint16Array.from(pairs);
}

/** Por dónde entra: desde fuera de la ventana, por el borde más cercano al cursor. */
export function entrancePoint(x: number, y: number, width: number, height: number, margin = 40): Vec {
  const left = x;
  const right = width - x;
  const top = y;
  const bottom = height - y;
  const nearest = Math.min(left, right, top, bottom);
  if (nearest === left) return { x: -margin, y };
  if (nearest === right) return { x: width + margin, y };
  if (nearest === top) return { x, y: -margin };
  return { x, y: height + margin };
}

// ── Las patas ────────────────────────────────────────────────────────────────

/** Ángulo de cada par de patas respecto al rumbo, de delante hacia atrás. */
const LEG_ANGLES = [0.62, 1.22, 1.9, 2.52] as const;

export interface Leg {
  /** −1 izquierda, 1 derecha. */
  side: -1 | 1;
  /** 0 delantera … 3 trasera. */
  index: number;
  foot: Vec;
  from: Vec;
  to: Vec;
  /** Progreso del paso: 1 es apoyada. */
  t: number;
}

export interface Entity {
  pos: Vec;
  vel: Vec;
  /** Adónde va: el cursor, más su sacudida, más lo que la atrae. */
  target: Vec;
  pointer: Vec;
  /** La sacudida en curso, alrededor del cursor. */
  offset: Vec;
  /** Lo que se inclina hacia algo que se puede tocar. */
  lean: Vec;
  heading: number;
  legs: Leg[];
  /** Instante, en ms, del último movimiento del cursor. */
  lastMove: number;
  /** Se está moviendo sola. */
  idle: boolean;
  /** Lleva tanto tiempo quieta que ya no hace nada. */
  asleep: boolean;
  nextTwitch: number;
  /** Hasta cuándo dura el arranque rápido de una sacudida. */
  dartUntil: number;
  alpha: number;
  alphaTarget: number;
  rng: Rng;
  seed: number;
  /** Para no reservar nada al calcular el reposo de una pata. */
  scratch: Vec;
}

/** Lo que dura el arranque de una sacudida, y lo rápido que va mientras. */
const DART_MS = 90;
const DART_LAG = 0.05;

function restReach(config: EntityConfig): number {
  return (config.body.femur + config.body.tibia) * 0.78;
}

/** Dónde querría estar apoyado un pie ahora mismo. */
function legRest(entity: Entity, leg: Leg, config: EntityConfig, lead: number, out: Vec): Vec {
  const angle = entity.heading + leg.side * LEG_ANGLES[leg.index];
  const reach = restReach(config);
  out.x = entity.pos.x + Math.cos(angle) * reach + entity.vel.x * lead;
  out.y = entity.pos.y + Math.sin(angle) * reach + entity.vel.y * lead;
  return out;
}

/** Nace en (x, y), con las ocho patas apoyadas en la malla y todavía invisible. */
export function createEntity(config: EntityConfig, x: number, y: number, now: number): Entity {
  const seed = seedToInt(config.seed);
  const entity: Entity = {
    pos: { x, y },
    vel: { x: 0, y: 0 },
    target: { x, y },
    pointer: { x, y },
    offset: { x: 0, y: 0 },
    lean: { x: 0, y: 0 },
    heading: -Math.PI / 2,
    legs: [],
    lastMove: now,
    idle: false,
    asleep: false,
    nextTwitch: Infinity,
    dartUntil: 0,
    alpha: 0,
    alphaTarget: 1,
    rng: rngFromString(`${config.seed}|gestos`),
    seed,
    scratch: { x: 0, y: 0 },
  };
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < LEG_ANGLES.length; index += 1) {
      const leg: Leg = { side, index, foot: { x, y }, from: { x, y }, to: { x, y }, t: 1 };
      legRest(entity, leg, config, 0, entity.scratch);
      foothold(entity.scratch.x, entity.scratch.y, config.body.grid, seed, leg.foot);
      entity.legs.push(leg);
    }
  }
  return entity;
}

/** El cursor se ha movido: deja de moverse sola y vuelve a seguirlo. */
export function setPointer(entity: Entity, x: number, y: number, now: number, follow: boolean): void {
  if (follow) {
    entity.pointer.x = x;
    entity.pointer.y = y;
  }
  entity.lastMove = now;
  entity.idle = false;
  entity.asleep = false;
  entity.nextTwitch = Infinity;
  entity.offset.x = 0;
  entity.offset.y = 0;
}

function between(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/**
 * Una sacudida: o se desplaza de golpe unos píxeles alrededor del cursor y se
 * queda quieta, o levanta una pata y vuelve a apoyarla. Lo inquietante no es
 * el movimiento, es la quietud de después.
 */
function twitch(entity: Entity, config: EntityConfig, now: number): void {
  if (entity.rng() < 0.3) {
    const leg = entity.legs[Math.floor(entity.rng() * entity.legs.length)];
    if (leg.t >= 1) {
      legRest(entity, leg, config, 0, entity.scratch);
      leg.from.x = leg.foot.x;
      leg.from.y = leg.foot.y;
      const nudge = config.body.grid * 0.8;
      foothold(
        entity.scratch.x + (entity.rng() - 0.5) * nudge,
        entity.scratch.y + (entity.rng() - 0.5) * nudge,
        config.body.grid,
        entity.seed,
        leg.to,
      );
      leg.t = 0;
    }
    return;
  }
  const angle = entity.rng() * TAU;
  const reach = config.idle.reach * (0.35 + 0.65 * entity.rng());
  entity.offset.x = Math.cos(angle) * reach;
  entity.offset.y = Math.sin(angle) * reach;
  entity.dartUntil = now + DART_MS / config.motion.speed;
}

/** Ninguna pata vecina está dando un paso: la de delante, la de detrás y la de enfrente. */
function canStep(entity: Entity, leg: Leg): boolean {
  let moving = 0;
  for (const other of entity.legs) {
    if (other.t >= 1) continue;
    moving += 1;
    const sameSideNeighbour = other.side === leg.side && Math.abs(other.index - leg.index) === 1;
    const opposite = other.side !== leg.side && other.index === leg.index;
    if (sameSideNeighbour || opposite) return false;
  }
  return moving < 4;
}

function stepLegs(entity: Entity, config: EntityConfig, dt: number): boolean {
  const { femur, tibia, stride, stepMs, grid } = config.body;
  const span = femur + tibia;
  let stepping = false;
  for (const leg of entity.legs) {
    const rest = legRest(entity, leg, config, 0.07, entity.scratch);
    if (leg.t < 1) {
      leg.t = Math.min(1, leg.t + (dt * 1000 * config.motion.speed) / stepMs);
      const k = easeInOut(leg.t);
      const x = lerp(leg.from.x, leg.to.x, k);
      const y = lerp(leg.from.y, leg.to.y, k);
      // Al levantarse el pie se recoge un poco hacia el cuerpo: así se ve un paso visto desde arriba.
      const lift = Math.sin(Math.PI * leg.t) * 0.22;
      leg.foot.x = x + (entity.pos.x - x) * lift;
      leg.foot.y = y + (entity.pos.y - y) * lift;
      stepping = stepping || leg.t < 1;
      continue;
    }
    // Si el cuerpo se ha ido demasiado lejos —una pestaña que vuelve, un salto—, el pie se recoloca sin paso.
    if (Math.hypot(leg.foot.x - entity.pos.x, leg.foot.y - entity.pos.y) > span * 1.6) {
      foothold(rest.x, rest.y, grid, entity.seed, leg.foot);
      continue;
    }
    if (Math.hypot(leg.foot.x - rest.x, leg.foot.y - rest.y) > stride && canStep(entity, leg)) {
      leg.from.x = leg.foot.x;
      leg.from.y = leg.foot.y;
      // Un poco más allá del reposo, para que el paso siguiente tarde en llegar.
      foothold(rest.x + (rest.x - leg.foot.x) * 0.3, rest.y + (rest.y - leg.foot.y) * 0.3, grid, entity.seed, leg.to);
      leg.t = 0;
      stepping = true;
    }
  }
  return stepping;
}

/**
 * Un paso de tiempo. Devuelve si queda algo en marcha: mientras sea verdad,
 * el componente pide otro fotograma; si no, deja de pedirlos.
 */
export function stepEntity(entity: Entity, config: EntityConfig, dt: number, now: number): boolean {
  const { speed } = config.motion;

  // 1. Quieta: al rato se mueve sola, y mucho después ya ni eso.
  if (config.interactions.idle && !entity.asleep) {
    const still = now - entity.lastMove;
    if (still > config.idle.sleepAfter / speed) {
      entity.asleep = true;
      entity.idle = false;
      entity.nextTwitch = Infinity;
    } else if (still > config.idle.after / speed) {
      if (!entity.idle) {
        entity.idle = true;
        entity.nextTwitch = now + between(entity.rng, config.idle.pauseMin, config.idle.pauseMax) / speed;
      } else if (now >= entity.nextTwitch) {
        twitch(entity, config, now);
        entity.nextTwitch = now + between(entity.rng, config.idle.pauseMin, config.idle.pauseMax) / speed;
      }
    }
  }

  // 2. Adónde va.
  entity.target.x = entity.pointer.x + entity.offset.x + entity.lean.x;
  entity.target.y = entity.pointer.y + entity.offset.y + entity.lean.y;

  // 3. Un muelle: llega en unos `lag` segundos y, con amortiguación por debajo de 1, se pasa un poco.
  if (dt > 0) {
    const lag = (now < entity.dartUntil ? DART_LAG : config.motion.lag) / speed;
    const omega = 2 / Math.max(0.01, lag);
    const zeta = config.motion.damping;
    entity.vel.x += (omega * omega * (entity.target.x - entity.pos.x) - 2 * zeta * omega * entity.vel.x) * dt;
    entity.vel.y += (omega * omega * (entity.target.y - entity.pos.y) - 2 * zeta * omega * entity.vel.y) * dt;
    const velocity = Math.hypot(entity.vel.x, entity.vel.y);
    const limit = config.motion.maxSpeed * speed;
    if (velocity > limit) {
      entity.vel.x *= limit / velocity;
      entity.vel.y *= limit / velocity;
    }
    entity.pos.x += entity.vel.x * dt;
    entity.pos.y += entity.vel.y * dt;
  }

  // 4. Hacia dónde mira: hacia donde va o, parada, hacia lo que la atrae.
  const velocity = Math.hypot(entity.vel.x, entity.vel.y);
  if (velocity > 25) {
    const wanted = Math.atan2(entity.vel.y, entity.vel.x);
    entity.heading += angleDelta(entity.heading, wanted) * Math.min(1, dt * 9);
  } else if (entity.lean.x !== 0 || entity.lean.y !== 0) {
    const wanted = Math.atan2(entity.lean.y, entity.lean.x);
    entity.heading += angleDelta(entity.heading, wanted) * Math.min(1, dt * 2.5);
  }

  // 5. Las patas.
  const stepping = stepLegs(entity, config, dt);

  // 6. La opacidad va hacia la que toca sin saltos.
  entity.alpha += (entity.alphaTarget - entity.alpha) * (1 - Math.exp(-dt / 0.28));
  if (Math.abs(entity.alphaTarget - entity.alpha) < 0.002) entity.alpha = entity.alphaTarget;

  const moving = velocity > 1.5 || Math.hypot(entity.target.x - entity.pos.x, entity.target.y - entity.pos.y) > 0.4;
  return moving || stepping || entity.alpha !== entity.alphaTarget;
}

/** La cadera, en el borde del cuerpo, hacia donde sale la pata. */
export function hipOf(entity: Entity, leg: Leg, config: EntityConfig, out: Vec): Vec {
  const angle = entity.heading + leg.side * LEG_ANGLES[leg.index];
  const r = config.body.size * 0.9;
  out.x = entity.pos.x + Math.cos(angle) * r;
  out.y = entity.pos.y + Math.sin(angle) * r;
  return out;
}

/**
 * La rodilla, por cinemática inversa de dos tramos. `bend` elige hacia qué
 * lado se dobla. Si el pie queda fuera de alcance, la pata se estira hacia él.
 */
export function solveKnee(hip: Vec, foot: Vec, femur: number, tibia: number, bend: number, out: Vec): Vec {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const d = clamp(Math.hypot(dx, dy), Math.abs(femur - tibia) + 1e-3, femur + tibia - 1e-3);
  const base = Math.atan2(dy, dx);
  const cos = clamp((femur * femur + d * d - tibia * tibia) / (2 * femur * d), -1, 1);
  const angle = base + bend * Math.acos(cos);
  out.x = hip.x + Math.cos(angle) * femur;
  out.y = hip.y + Math.sin(angle) * femur;
  return out;
}

/** Hacia qué lado dobla cada pata: las delanteras con la rodilla adelantada, las traseras atrasada. */
export function bendOf(leg: Leg): number {
  return leg.index < 2 ? -leg.side : leg.side;
}

/** Por detrás del cuerpo: de ahí sale la seda. */
export function spinneretOf(entity: Entity, config: EntityConfig, out: Vec): Vec {
  out.x = entity.pos.x - Math.cos(entity.heading) * config.body.size * 2.6;
  out.y = entity.pos.y - Math.sin(entity.heading) * config.body.size * 2.6;
  return out;
}

// ── Zonas e hilos ────────────────────────────────────────────────────────────

/** Distancia de un punto a un rectángulo: 0 si está dentro. */
export function rectDistance(px: number, py: number, rect: Rect): number {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

/** El punto del rectángulo más cercano a (px, py). */
export function closestOnRect(px: number, py: number, rect: Rect, out: Vec): Vec {
  out.x = clamp(px, rect.x, rect.x + rect.w);
  out.y = clamp(py, rect.y, rect.y + rect.h);
  return out;
}

export function rectContains(rect: Rect, px: number, py: number, margin = 0): boolean {
  return (
    px >= rect.x - margin && px <= rect.x + rect.w + margin && py >= rect.y - margin && py <= rect.y + rect.h + margin
  );
}

/** Histéresis: se acerca por debajo de `radius` y no se aleja hasta pasar `release`. */
export function nearAfter(wasNear: boolean, distance: number, radius: number, release: number): boolean {
  return wasNear ? distance <= release : distance <= radius;
}

/** Cuánto se inclina hacia un punto: una fracción de la distancia, con tope. */
export function leanToward(from: Vec, point: Vec, fraction: number, max: number, out: Vec): Vec {
  const dx = (point.x - from.x) * fraction;
  const dy = (point.y - from.y) * fraction;
  const length = Math.hypot(dx, dy);
  const k = length > max ? max / length : 1;
  out.x = dx * k;
  out.y = dy * k;
  return out;
}

/**
 * El punto de control de un hilo entre `a` y `b`: cuelga hacia abajo una
 * fracción `sag` de su largo, y se mece de lado `sway` píxeles.
 */
export function threadControl(a: Vec, b: Vec, sag: number, sway: number, out: Vec): Vec {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  out.x = (a.x + b.x) / 2 + (-dy / length) * sway;
  out.y = (a.y + b.y) / 2 + (dx / length) * sway + length * sag;
  return out;
}

/** El trozo de la curva de `a` a `b` (control `c`) hasta `t`: el hilo mientras se tiende. */
export function splitQuad(a: Vec, c: Vec, b: Vec, t: number, outControl: Vec, outEnd: Vec): void {
  const acx = lerp(a.x, c.x, t);
  const acy = lerp(a.y, c.y, t);
  const cbx = lerp(c.x, b.x, t);
  const cby = lerp(c.y, b.y, t);
  outControl.x = acx;
  outControl.y = acy;
  outEnd.x = lerp(acx, cbx, t);
  outEnd.y = lerp(acy, cby, t);
}
