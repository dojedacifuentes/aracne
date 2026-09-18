import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import type { Vec2 } from '../lib/aleph/tension';
import { GRIP, SCENE, SPIDER_DEFAULTS, type SpiderOptions } from '../ui/components/spider/spiderConfig';
import {
  clampSpeed,
  hitSize,
  resist,
  resistInPlace,
  trackMove,
  trackSpeed,
  trackStart,
  type PointerTrack,
} from '../ui/components/spider/spiderMotion';
import { SpiderRig } from '../ui/components/spider/SpiderRig';

const out = (): Vec2 => ({ x: 0, y: 0 });
const track = (): PointerTrack => ({ x: 0, y: 0, t: 0, vx: 0, vy: 0 });

/**
 * El botón que se pulsa y se enfoca no puede depender de que alguien mida el
 * escenario: `onLayout` llega por un `ResizeObserver`, y un `ResizeObserver` no
 * entrega nada donde no se repinta. Medido el 18 de septiembre de 2026 en un
 * panel oculto: el escenario medía 460×460 en el DOM y el observador no
 * disparó ni una vez, así que el botón no llegaba a existir.
 */
describe('el objetivo que se pulsa', () => {
  const sin = { width: 0, height: 0 };

  it('sin medida del escenario no mide cero, mide el mínimo', () => {
    expect(hitSize(sin, 1)).toBe(GRIP.minHit);
    expect(hitSize(sin, 0.4)).toBe(GRIP.minHit);
    expect(hitSize({ width: 0, height: 900 }, 1)).toBe(GRIP.minHit);
  });

  it('el mínimo se puede coger: el doble del área táctil de la interfaz', () => {
    // `HIT_SIZE` de ui/theme.ts es 44; aquí no se importa porque arrastraría
    // react-native a las pruebas. La araña se coge, no solo se toca.
    expect(GRIP.minHit).toBe(88);
  });

  it('con medida crece con la envergadura del animal', () => {
    const grande = hitSize({ width: 460, height: 460 }, 1);
    expect(grande).toBeCloseTo(460 * SCENE.span * 1.3, 6);
    expect(grande).toBeGreaterThan(GRIP.minHit);
    // Y cubre al animal con margen, porque las patas tiran de él.
    expect(grande).toBeGreaterThan(460 * SCENE.span);
  });

  it('manda el lado corto, que es el que limita a la araña', () => {
    expect(hitSize({ width: 1200, height: 460 }, 1)).toBe(hitSize({ width: 460, height: 1200 }, 1));
  });

  it('un escenario pequeño no baja del mínimo', () => {
    expect(hitSize({ width: 120, height: 120 }, 1)).toBe(GRIP.minHit);
  });
});

describe('la resistencia al tirar', () => {
  it('no se mueve si no se tira, y al principio cede lo que se le pide', () => {
    expect(resist(0, 1)).toBe(0);
    // f′(0) = 1: el primer milímetro se obedece entero.
    expect(resist(1e-4, 1)).toBeCloseTo(1e-4, 7);
  });

  it('crece siempre, cada vez menos, y nunca llega al tope', () => {
    const reach = 0.85;
    let previous = 0;
    let previousGain = Infinity;
    for (let d = 0.02; d < 20; d += 0.02) {
      const value = resist(d, reach);
      const gain = value - previous;
      expect(value).toBeGreaterThan(previous);
      expect(gain).toBeLessThan(previousGain);
      expect(value).toBeLessThan(reach);
      previous = value;
      previousGain = gain;
    }
    // A la distancia del tope ya solo se obedece la mitad.
    expect(resist(reach, reach)).toBeCloseTo(reach / 2, 12);
  });

  it('tirar el doble de lejos no desplaza el doble', () => {
    const reach = 0.85;
    expect(resist(1.2, reach)).toBeLessThan(2 * resist(0.6, reach));
  });

  it('sobre un vector cambia el módulo y respeta la dirección', () => {
    const o = out();
    resistInPlace(o, 3, 4, 1);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(resist(5, 1), 12);
    expect(o.y / o.x).toBeCloseTo(4 / 3, 12);

    resistInPlace(o, 0, 0, 1);
    expect(o).toEqual({ x: 0, y: 0 });
  });
});

describe('el recorte de la velocidad', () => {
  it('por debajo del tope no toca nada', () => {
    const o = out();
    clampSpeed(o, 0.3, -0.4, 1);
    expect(o).toEqual({ x: 0.3, y: -0.4 });
  });

  it('por encima recorta al tope sin torcer el golpe', () => {
    const o = out();
    clampSpeed(o, 30, 40, 2);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(2, 12);
    expect(o.y / o.x).toBeCloseTo(40 / 30, 12);
  });
});

describe('la velocidad de la mano', () => {
  it('con un gesto sostenido converge a su velocidad real', () => {
    const t = trackStart(track(), 0, 0, 0);
    for (let i = 1; i <= 20; i += 1) trackMove(t, i * 16, -i * 8, i * 16);
    expect(t.vx).toBeCloseTo(1000, 3);
    expect(t.vy).toBeCloseTo(-500, 3);
  });

  it('dos avisos en el mismo milisegundo no dan una velocidad infinita', () => {
    const t = trackStart(track(), 0, 0, 100);
    trackMove(t, 400, 0, 100);
    expect(Number.isFinite(t.vx)).toBe(true);
    expect(Math.abs(t.vx)).toBeLessThanOrEqual((400 / GRIP.sampleMinMs) * 1000);
  });

  it('un fotograma perdido no se lee como una mano lenta', () => {
    const lento = trackStart(track(), 0, 0, 0);
    trackMove(lento, 100, 0, 400);
    // El intervalo se acota: 400 ms cuentan como GRIP.sampleMaxMs.
    expect(lento.vx).toBeCloseTo((100 / GRIP.sampleMaxMs) * 1000 * GRIP.sampleBlend, 9);
  });

  it('sujetar quieto y soltar no lanza nada', () => {
    const t = trackStart(track(), 0, 0, 0);
    for (let i = 1; i <= 10; i += 1) trackMove(t, i * 16, 0, i * 16);
    const enMarcha = trackSpeed(out(), t, t.t);
    const parada = trackSpeed(out(), t, t.t + GRIP.staleMs * 6);
    expect(enMarcha.x).toBeGreaterThan(900);
    expect(Math.abs(parada.x)).toBeLessThan(enMarcha.x * 0.01);
  });
});

/** Una araña de laboratorio: sin micro movimiento, para medir solo la mano. */
function rig(overrides: Partial<SpiderOptions> = {}) {
  const options: SpiderOptions = {
    ...SPIDER_DEFAULTS,
    motionIntensity: 0,
    entrance: 'none',
    position: [0.5, 0.5],
    ...overrides,
  };
  const animal = new SpiderRig(new Object3D(), options);
  animal.setStage({ width: 2, height: 2 });
  animal.setLegs([], 11, true, 0);
  return animal;
}

const SPAN = SCENE.span * 2;
/** Cuánto se ha ido el cuerpo de su sitio, en envergaduras. */
const strayed = (animal: SpiderRig) => Math.hypot(animal.bodyPosition.x, animal.bodyPosition.y) / SPAN;

function run(animal: SpiderRig, seconds: number, quiet = false, at = 0): number {
  const frames = Math.round(seconds * 60);
  let peak = 0;
  for (let i = 1; i <= frames; i += 1) {
    animal.update(at + i / 60, 1 / 60, quiet);
    peak = Math.max(peak, strayed(animal));
  }
  return peak;
}

describe('sujetar, tirar y soltar', () => {
  it('en reposo está donde dicen las patas, y sujetarla sin moverla casi no la mueve', () => {
    const animal = rig();
    run(animal, 1);
    expect(strayed(animal)).toBeLessThan(0.001);

    animal.beginGrab(0, 0);
    expect(run(animal, 0.6)).toBeLessThan(0.02);
  });

  it('el cuerpo sigue a la mano, pero siempre por detrás y sin pasarse del alcance', () => {
    const animal = rig();
    run(animal, 1);
    animal.beginGrab(0, 0);
    animal.dragTo(0, 0);
    // Un tirón largo hacia la derecha, a mano abierta.
    for (let i = 1; i <= 60; i += 1) {
      animal.dragTo((i / 60) * 3 * SPAN, 0);
      animal.update(1 + i / 60, 1 / 60, false);
    }
    const seguido = animal.bodyPosition.x / SPAN;
    expect(seguido).toBeGreaterThan(0.2);
    expect(seguido).toBeLessThan(GRIP.dragReach);
  });

  it('al soltar pasa de largo, oscila y se para en su sitio', () => {
    const animal = rig();
    run(animal, 1);
    animal.beginGrab(0, 0);
    animal.dragTo(0, 0);
    animal.dragTo(SPAN, 0);
    run(animal, 0.6, false, 1);
    expect(animal.bodyPosition.x).toBeGreaterThan(0);

    animal.release(-2 * SPAN, 0);
    let crossed = false;
    for (let i = 1; i <= 120; i += 1) {
      animal.update(2 + i / 60, 1 / 60, false);
      if (animal.bodyPosition.x < -0.002 * SPAN) crossed = true;
    }
    // Pasó al otro lado del reposo: eso es el retroceso.
    expect(crossed).toBe(true);
    run(animal, 2, false, 4);
    expect(strayed(animal)).toBeLessThan(0.005);
  });

  it('el retroceso se ve: pasa de largo lo suficiente y se para antes de un segundo', () => {
    const animal = rig();
    run(animal, 1);
    animal.beginGrab(0, 0);
    animal.dragTo(0, 0);
    animal.dragTo(1.5 * SPAN, 0);
    run(animal, 0.7, false, 1);
    const desde = animal.bodyPosition.x / SPAN;
    expect(desde).toBeGreaterThan(0.4);

    animal.release(-3 * SPAN, 0);
    let sobrepaso = 0;
    for (let i = 1; i <= 60; i += 1) {
      animal.update(2 + i / 60, 1 / 60, false);
      sobrepaso = Math.min(sobrepaso, animal.bodyPosition.x / SPAN);
    }
    // Ni un redondeo ni un muelle de juguete: entre un 4 % y un 25 % de envergadura.
    expect(sobrepaso).toBeLessThan(-0.04);
    expect(sobrepaso).toBeGreaterThan(-0.25);
    // Y a los dos segundos ya no queda nada.
    run(animal, 1, false, 3);
    expect(strayed(animal)).toBeLessThan(0.005);
  });

  it('por rápido que se suelte, no se la puede lanzar fuera', () => {
    const animal = rig();
    run(animal, 1);
    animal.beginGrab(0, 0);
    animal.dragTo(0, 0);
    animal.dragTo(40 * SPAN, 25 * SPAN);
    run(animal, 0.8, false, 1);
    animal.release(4000 * SPAN, -4000 * SPAN);
    const peak = run(animal, 3, false, 2);
    expect(peak).toBeLessThan(GRIP.dragReach * 1.4);
    expect(strayed(animal)).toBeLessThan(0.005);
  });
});

describe('sin movimiento', () => {
  it('se puede tirar de ella igual, pero no hay recorrido ni retroceso', () => {
    const animal = rig();
    animal.update(0, 1 / 60, true);
    animal.beginGrab(0, 0);
    animal.dragTo(0, 0);
    animal.dragTo(SPAN, 0);
    animal.update(1 / 60, 1 / 60, true);
    // Sin muelle: el cuerpo está ya donde la mano lo dejó, no de camino.
    expect(animal.bodyPosition.x / SPAN).toBeCloseTo(resist(1, GRIP.dragReach), 9);

    animal.release(-6 * SPAN, 0);
    animal.update(2 / 60, 1 / 60, true);
    expect(strayed(animal)).toBe(0);
    // Y no se pasa al otro lado en ningún momento: no hay oscilación que amortiguar.
    for (let i = 3; i < 60; i += 1) {
      animal.update(i / 60, 1 / 60, true);
      expect(animal.bodyPosition.x).toBe(0);
    }
  });
});

describe('el anclaje del hilo', () => {
  it('el extremo de arriba no se mueve cuando el cuerpo sí', () => {
    const animal = rig();
    run(animal, 1);
    const silk = animal.object.children[0] as unknown as {
      geometry: { attributes: { position: { array: Float32Array } } };
    };
    const anchor = silk.geometry.attributes.position.array;
    const before = [anchor[0], anchor[1]] as const;

    animal.beginGrab(0, 0);
    animal.dragTo(0, 0);
    animal.dragTo(2 * SPAN, -1.5 * SPAN);
    run(animal, 0.7, false, 1);

    expect(Math.abs(animal.bodyPosition.x)).toBeGreaterThan(0.2 * SPAN);
    expect(anchor[0]).toBeCloseTo(before[0], 12);
    expect(anchor[1]).toBeCloseTo(before[1], 12);
  });
});
