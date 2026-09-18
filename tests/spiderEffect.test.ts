import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ENTITY_DEFAULTS,
  resolveEntityConfig,
  shouldRun,
  type EntityConfig,
} from '../ui/components/spiderEffect/spiderEffectConfig';
import {
  closestOnRect,
  createEntity,
  entrancePoint,
  foothold,
  hash01,
  hipOf,
  leanToward,
  linkAnchors,
  nearAfter,
  rectContains,
  rectDistance,
  scatterAnchors,
  setPointer,
  solveKnee,
  splitQuad,
  stepEntity,
  threadControl,
  type Vec,
} from '../ui/components/spiderEffect/spiderEffectMotion';

const FRAME = 1000 / 60;

/** Avanza la entidad `frames` fotogramas desde `start` y devuelve el instante final. */
function run(config: EntityConfig, entity: ReturnType<typeof createEntity>, start: number, frames: number): number {
  let now = start;
  for (let i = 0; i < frames; i += 1) {
    now += FRAME;
    stepEntity(entity, config, FRAME / 1000, now);
  }
  return now;
}

describe('la configuración', () => {
  it('pinta con la paleta y nunca con el acento', () => {
    // Se guardan por su nombre en `theme.ts`: el tipo ya impide escribir un color de fuera.
    for (const token of [ENTITY_DEFAULTS.look.color, ENTITY_DEFAULTS.look.body]) {
      expect(['bg', 'surface', 'line', 'text', 'dim']).toContain(token);
    }
  });

  it('se nota poco, y sobre el texto que se lee todavía menos', () => {
    expect(ENTITY_DEFAULTS.look.intensity).toBeGreaterThan(0);
    expect(ENTITY_DEFAULTS.look.intensity).toBeLessThanOrEqual(0.6);
    expect(ENTITY_DEFAULTS.look.quietIntensity).toBeLessThan(ENTITY_DEFAULTS.look.intensity / 2);
  });

  it('cada interacción se apaga por separado y lo demás se queda como estaba', () => {
    const config = resolveEntityConfig({ interactions: { threads: false } as EntityConfig['interactions'] });
    expect(config.interactions.threads).toBe(false);
    expect(config.interactions.follow).toBe(true);
    expect(config.look).toEqual(ENTITY_DEFAULTS.look);
    // Y los valores por defecto no se tocan.
    expect(ENTITY_DEFAULTS.interactions.threads).toBe(true);
    expect(resolveEntityConfig()).toEqual(ENTITY_DEFAULTS);
  });

  it('solo existe con ratón, con ancho y sin reducción de movimiento; y se puede apagar entera', () => {
    const ok = { reduceMotion: false, finePointer: true, width: 1440 };
    expect(shouldRun(ENTITY_DEFAULTS, ok)).toBe(true);
    expect(shouldRun(ENTITY_DEFAULTS, { ...ok, reduceMotion: true })).toBe(false);
    expect(shouldRun(ENTITY_DEFAULTS, { ...ok, finePointer: false })).toBe(false);
    expect(shouldRun(ENTITY_DEFAULTS, { ...ok, width: ENTITY_DEFAULTS.device.minWidth - 1 })).toBe(false);
    expect(shouldRun(resolveEntityConfig({ enabled: false }), ok)).toBe(false);
  });
});

describe('la tela', () => {
  it('el hash es estable y cae en [0, 1)', () => {
    for (let i = -5; i < 5; i += 1) {
      const value = hash01(i, i * 3, 42);
      expect(value).toBe(hash01(i, i * 3, 42));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('los pies caen siempre en el mismo sitio de la malla, cerca de donde se pide', () => {
    const grid = ENTITY_DEFAULTS.body.grid;
    const a = foothold(103.4, 57.2, grid, 7, { x: 0, y: 0 });
    const b = foothold(103.4, 57.2, grid, 7, { x: 0, y: 0 });
    expect(a).toEqual(b);
    expect(Math.hypot(a.x - 103.4, a.y - 57.2)).toBeLessThan(grid);
    // Un punto de la malla es su propio apoyo.
    expect(foothold(a.x, a.y, grid, 7, { x: 0, y: 0 })).toEqual(a);
    expect(foothold(103.4, 57.2, grid, 8, { x: 0, y: 0 })).not.toEqual(a);
  });

  it('las anclas son las pedidas, caen dentro de la ventana y no dependen del azar', () => {
    const anchors = scatterAnchors(170, 1440, 900, 'entidad');
    expect(anchors.length).toBe(340);
    for (let i = 0; i < anchors.length; i += 2) {
      expect(anchors[i]).toBeGreaterThanOrEqual(0);
      expect(anchors[i]).toBeLessThanOrEqual(1440);
      expect(anchors[i + 1]).toBeGreaterThanOrEqual(0);
      expect(anchors[i + 1]).toBeLessThanOrEqual(900);
    }
    expect(scatterAnchors(170, 1440, 900, 'entidad')).toEqual(anchors);
    expect(scatterAnchors(170, 1440, 900, 'otra')).not.toEqual(anchors);
  });

  it('una tela y no una maraña: hilos cortos y pocos por ancla', () => {
    const anchors = scatterAnchors(170, 1440, 900, 'entidad');
    const pairs = linkAnchors(anchors, ENTITY_DEFAULTS.web.link, 3);
    expect(pairs.length).toBeGreaterThan(0);
    const degree = new Map<number, number>();
    for (let p = 0; p < pairs.length; p += 2) {
      const [i, j] = [pairs[p], pairs[p + 1]];
      const d = Math.hypot(anchors[2 * j] - anchors[2 * i], anchors[2 * j + 1] - anchors[2 * i + 1]);
      expect(d).toBeLessThanOrEqual(ENTITY_DEFAULTS.web.link);
      degree.set(i, (degree.get(i) ?? 0) + 1);
      degree.set(j, (degree.get(j) ?? 0) + 1);
    }
    for (const count of degree.values()) expect(count).toBeLessThanOrEqual(3);
  });

  it('entra por el borde más cercano al cursor, desde fuera', () => {
    expect(entrancePoint(10, 400, 1440, 900)).toEqual({ x: -40, y: 400 });
    expect(entrancePoint(1400, 400, 1440, 900)).toEqual({ x: 1480, y: 400 });
    expect(entrancePoint(700, 20, 1440, 900)).toEqual({ x: 700, y: -40 });
    expect(entrancePoint(700, 880, 1440, 900)).toEqual({ x: 700, y: 940 });
  });
});

describe('el movimiento', () => {
  it('alcanza al cursor con retraso y sin rebotar de más', () => {
    const config = resolveEntityConfig({ interactions: { idle: false } as EntityConfig['interactions'] });
    const entity = createEntity(config, 0, 0, 0);
    setPointer(entity, 400, 0, 0, true);
    let now = 0;
    let furthest = 0;
    let earlyX = 0;
    for (let i = 0; i < 180; i += 1) {
      now += FRAME;
      stepEntity(entity, config, FRAME / 1000, now);
      furthest = Math.max(furthest, entity.pos.x);
      if (i === 5) earlyX = entity.pos.x;
    }
    // Con retraso: a los 100 ms todavía va lejos.
    expect(earlyX).toBeLessThan(200);
    // Llega.
    expect(Math.abs(entity.pos.x - 400)).toBeLessThan(1);
    // Se pasa un poco —es lo inquietante— pero no rebota como un muelle de juguete.
    expect(furthest).toBeGreaterThan(400);
    expect(furthest - 400).toBeLessThan(400 * 0.08);
  });

  it('nunca pasa del tope de velocidad', () => {
    const config = resolveEntityConfig({ interactions: { idle: false } as EntityConfig['interactions'] });
    const entity = createEntity(config, 0, 0, 0);
    setPointer(entity, 5000, 3000, 0, true);
    let now = 0;
    for (let i = 0; i < 60; i += 1) {
      now += FRAME;
      stepEntity(entity, config, FRAME / 1000, now);
      expect(Math.hypot(entity.vel.x, entity.vel.y)).toBeLessThanOrEqual(config.motion.maxSpeed + 1e-6);
    }
  });

  it('parada, se mueve sola cerca del cursor; y los gestos son los mismos en cualquier máquina', () => {
    const config = ENTITY_DEFAULTS;
    const a = createEntity(config, 200, 200, 0);
    const b = createEntity(config, 200, 200, 0);
    setPointer(a, 200, 200, 0, true);
    setPointer(b, 200, 200, 0, true);
    let moved = false;
    let now = 0;
    for (let i = 0; i < 60 * 8; i += 1) {
      now += FRAME;
      stepEntity(a, config, FRAME / 1000, now);
      stepEntity(b, config, FRAME / 1000, now);
      if (a.offset.x !== 0 || a.offset.y !== 0) moved = true;
      expect(Math.hypot(a.offset.x, a.offset.y)).toBeLessThanOrEqual(config.idle.reach + 1e-9);
    }
    expect(moved).toBe(true);
    expect(a.pos).toEqual(b.pos);
    expect(a.legs.map((leg) => leg.foot)).toEqual(b.legs.map((leg) => leg.foot));
  });

  it('mucho rato quieta, se duerme y deja de pedir fotogramas', () => {
    const config = ENTITY_DEFAULTS;
    const entity = createEntity(config, 300, 300, 0);
    setPointer(entity, 300, 300, 0, true);
    const now = run(config, entity, 0, Math.ceil((config.idle.sleepAfter + 3000) / FRAME));
    expect(entity.asleep).toBe(true);
    expect(stepEntity(entity, config, FRAME / 1000, now + FRAME)).toBe(false);
    // Y el cursor la despierta.
    setPointer(entity, 330, 300, now, true);
    expect(entity.asleep).toBe(false);
    expect(stepEntity(entity, config, FRAME / 1000, now + FRAME)).toBe(true);
  });

  it('sin la interacción de estar quieta, no hace nada por su cuenta', () => {
    const config = resolveEntityConfig({ interactions: { idle: false } as EntityConfig['interactions'] });
    const entity = createEntity(config, 300, 300, 0);
    setPointer(entity, 300, 300, 0, true);
    run(config, entity, 0, 60 * 10);
    expect(entity.offset).toEqual({ x: 0, y: 0 });
    expect(entity.idle).toBe(false);
  });

  it('sin seguir al cursor, el cursor la despierta pero no la mueve', () => {
    const config = resolveEntityConfig({ interactions: { follow: false } as EntityConfig['interactions'] });
    const entity = createEntity(config, 100, 100, 0);
    setPointer(entity, 900, 500, 50, false);
    expect(entity.pointer).toEqual({ x: 100, y: 100 });
    expect(entity.lastMove).toBe(50);
  });

  it('camina apoyando los pies en la malla, y las patas miden lo que miden', () => {
    const config = resolveEntityConfig({ interactions: { idle: false } as EntityConfig['interactions'] });
    const entity = createEntity(config, 0, 0, 0);
    setPointer(entity, 600, 250, 0, true);
    run(config, entity, 0, 150);
    const hip: Vec = { x: 0, y: 0 };
    const knee: Vec = { x: 0, y: 0 };
    for (const leg of entity.legs) {
      expect(leg.t).toBe(1);
      expect(foothold(leg.foot.x, leg.foot.y, config.body.grid, entity.seed, { x: 0, y: 0 })).toEqual(leg.foot);
      hipOf(entity, leg, config, hip);
      solveKnee(hip, leg.foot, config.body.femur, config.body.tibia, 1, knee);
      expect(Math.hypot(knee.x - hip.x, knee.y - hip.y)).toBeCloseTo(config.body.femur, 6);
      const reach = Math.hypot(leg.foot.x - hip.x, leg.foot.y - hip.y);
      if (reach < config.body.femur + config.body.tibia && reach > Math.abs(config.body.femur - config.body.tibia)) {
        expect(Math.hypot(leg.foot.x - knee.x, leg.foot.y - knee.y)).toBeCloseTo(config.body.tibia, 6);
      }
    }
  });
});

describe('las zonas y los hilos', () => {
  const rect = { x: 100, y: 100, w: 200, h: 50 };

  it('distancia a un rectángulo: cero dentro, y a su borde fuera', () => {
    expect(rectDistance(150, 120, rect)).toBe(0);
    expect(rectDistance(50, 120, rect)).toBe(50);
    expect(rectDistance(330, 190, rect)).toBeCloseTo(50, 6);
    expect(closestOnRect(0, 0, rect, { x: 0, y: 0 })).toEqual({ x: 100, y: 100 });
    expect(rectContains(rect, 99, 120)).toBe(false);
    expect(rectContains(rect, 99, 120, 2)).toBe(true);
  });

  it('se acerca por debajo de un radio y no se aleja hasta pasar otro: no parpadea en el borde', () => {
    expect(nearAfter(false, 61, 60, 84)).toBe(false);
    expect(nearAfter(false, 60, 60, 84)).toBe(true);
    expect(nearAfter(true, 80, 60, 84)).toBe(true);
    expect(nearAfter(true, 85, 60, 84)).toBe(false);
  });

  it('se inclina hacia lo que la atrae, pero con tope', () => {
    const out = leanToward({ x: 0, y: 0 }, { x: 1000, y: 0 }, 0.14, 14, { x: 0, y: 0 });
    expect(out).toEqual({ x: 14, y: 0 });
    const near = leanToward({ x: 0, y: 0 }, { x: 50, y: 0 }, 0.14, 14, { x: 0, y: 0 });
    expect(near.x).toBeCloseTo(7, 6);
  });

  it('un hilo cuelga hacia abajo y se tiende de un extremo al otro', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    const control = threadControl(a, b, 0.07, 0, { x: 0, y: 0 });
    expect(control.x).toBe(50);
    expect(control.y).toBeCloseTo(7, 6);
    const c = { x: 0, y: 0 };
    const end = { x: 0, y: 0 };
    splitQuad(a, control, b, 0, c, end);
    expect(end).toEqual(a);
    splitQuad(a, control, b, 1, c, end);
    expect(end).toEqual(b);
  });
});

/**
 * CLAUDE.md, regla 3: toda la aleatoriedad pasa por el PRNG sembrado. El
 * handoff decía que había una prueba que lo vigilaba, y no la había.
 */
describe('sin Math.random', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return files(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });

  it('ningún archivo del motor ni de la interfaz lo llama', () => {
    const offenders = [...files('lib'), ...files('ui')].filter((path) => {
      const code = readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      return /Math\.random\s*\(/.test(code);
    });
    expect(offenders).toEqual([]);
  });
});
