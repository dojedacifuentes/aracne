import { describe, expect, it } from 'vitest';

import { spring, type Vec2 } from '../lib/aleph/tension';
import { MOTION } from '../ui/components/spider/spiderConfig';
import {
  ambientAt,
  pupil,
  smoothDamp,
  springInPlace,
  stillAmbient,
} from '../ui/components/spider/spiderMotion';

describe('movimiento de la araña', () => {
  it('springInPlace es spring() de tension.ts sin reservar memoria', () => {
    let position: Vec2 = { x: 0.3, y: -0.2 };
    let velocity: Vec2 = { x: 1, y: -0.5 };
    const state = { x: 0.3, y: -0.2, vx: 1, vy: -0.5 };
    const target = { x: -0.1, y: 0.25 };
    for (let frame = 0; frame < 5; frame += 1) {
      for (const dt of [1 / 60, 1 / 30, 1 / 144, 0.1, 0.004]) {
        ({ position, velocity } = spring(position, velocity, target, dt));
        springInPlace(state, target.x, target.y, dt);
        expect(state.x).toBe(position.x);
        expect(state.y).toBe(position.y);
        expect(state.vx).toBe(velocity.x);
        expect(state.vy).toBe(velocity.y);
      }
    }
  });

  it('el descenso llega al 1 % en seis segundos y sin rebotar', () => {
    const state = { value: 1, velocity: 0 };
    let lowest = 1;
    for (let i = 0; i < 60 * 6; i += 1) {
      smoothDamp(state, 0, 1.8, 1 / 60);
      lowest = Math.min(lowest, state.value);
    }
    expect(state.value).toBeLessThan(0.01);
    expect(lowest).toBeGreaterThanOrEqual(-1e-9);
  });

  it('el descenso no depende del framerate', () => {
    const at60 = { value: 1, velocity: 0 };
    const at144 = { value: 1, velocity: 0 };
    for (let i = 0; i < 120; i += 1) smoothDamp(at60, 0, 1.8, 1 / 60);
    for (let i = 0; i < 288; i += 1) smoothDamp(at144, 0, 1.8, 1 / 144);
    expect(Math.abs(at60.value - at144.value)).toBeLessThan(0.01);
  });

  it('la pupila se contrae un 8 % y vuelve a su tamaño', () => {
    expect(pupil(0)).toBe(1);
    expect(pupil(1)).toBe(1);
    let smallest = 1;
    for (let i = 1; i < 100; i += 1) smallest = Math.min(smallest, pupil(i / 100));
    expect(smallest).toBeCloseTo(MOTION.pressScale, 6);
  });

  it('el micro movimiento es casi imperceptible y se apaga del todo con intensidad 0', () => {
    const out = stillAmbient({ sway: 1, bob: 1, twist: 1, silkX: 1, silkZ: 1 });
    for (let t = 0; t < 600; t += 0.37) {
      ambientAt(t, 1, 1, out);
      expect(Math.abs(out.sway)).toBeLessThanOrEqual(MOTION.swayAngle + 1e-12);
      expect(Math.abs(out.bob)).toBeLessThanOrEqual(MOTION.bob + 1e-12);
      expect(Math.abs(out.twist)).toBeLessThanOrEqual(MOTION.twist + 1e-12);
      expect(Math.abs(out.silkX)).toBeLessThanOrEqual(MOTION.silkSway + 1e-12);
    }
    ambientAt(12.3, 0, 1, out);
    expect([out.sway, out.bob, out.twist, out.silkX, out.silkZ].every((value) => value === 0)).toBe(true);
  });
});
