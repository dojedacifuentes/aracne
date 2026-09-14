import { describe, expect, it } from 'vitest';

import {
  alephState,
  impulse,
  legVector,
  RING,
  spring,
  threadFrequency,
  type Vec2,
} from '../lib/aleph/tension';

const near = (value: number, expected: number, tolerance = 0.006) =>
  expect(Math.abs(value - expected)).toBeLessThanOrEqual(tolerance);

const everyLeg = () => Array.from({ length: RING.legs }, (_, i) => i);

describe('el anillo impar', () => {
  it('la suma de los once vectores es cero', () => {
    let x = 0;
    let y = 0;
    for (const leg of everyLeg()) {
      const v = legVector(leg);
      x += v.x;
      y += v.y;
    }
    expect(Math.hypot(x, y)).toBeLessThan(1e-12);
  });

  it('apoyar las once centra el cuerpo y lo deja casi opaco', () => {
    const state = alephState(everyLeg());
    expect(Math.hypot(state.offset.x, state.offset.y)).toBeLessThan(1e-9);
    near(state.distortion, 0.79);
  });

  it('ninguna selección parcial vuelve al centro', () => {
    let weakest = Infinity;
    for (let mask = 1; mask < (1 << RING.legs) - 1; mask += 1) {
      const legs = everyLeg().filter((i) => mask & (1 << i));
      weakest = Math.min(weakest, alephState(legs).strain);
    }
    expect(weakest).toBeGreaterThan(0.01);
  });

  it('reproduce la tabla medida de docs/ARANA.md', () => {
    near(alephState([]).strain, 0);
    near(alephState([]).distortion, 0.3);
    near(alephState([0]).strain, 1);
    near(alephState([0]).distortion, 0.34);
    near(alephState([0, 1]).strain, 1);
    near(alephState([0, 1]).distortion, 0.39);
    near(alephState([0, 5]).strain, 0.2);
    near(alephState([0, 4, 7]).strain, 0.18);
    near(alephState([0, 4, 7]).distortion, 0.43);
  });

  it('una pata tira hacia su propio ángulo', () => {
    for (const leg of everyLeg()) {
      const v = legVector(leg);
      const { offset } = alephState([leg]);
      expect(offset.x * v.x + offset.y * v.y).toBeGreaterThan(RING.reach - 1e-9);
    }
  });

  it('soltar golpea en sentido contrario y más débil que apoyar', () => {
    const press = impulse(3, 'apoyar');
    const release = impulse(3, 'soltar');
    expect(Math.hypot(release.x, release.y)).toBeLessThan(Math.hypot(press.x, press.y));
    expect(press.x * release.x + press.y * release.y).toBeLessThan(0);
  });

  it('patas vecinas vibran parecido; las lejanas, no', () => {
    const near1 = Math.abs(threadFrequency(1) - threadFrequency(0));
    const far = Math.abs(threadFrequency(5) - threadFrequency(0));
    expect(near1).toBeLessThan(far);
  });

  it('el muelle llega a su sitio sin rebotar', () => {
    let position: Vec2 = { x: 0, y: 0 };
    let velocity: Vec2 = { x: 0, y: 0 };
    const target = { x: RING.reach, y: 0 };
    let peak = 0;
    let troughAfterPeak = Infinity;
    for (let i = 0; i < 240; i += 1) {
      ({ position, velocity } = spring(position, velocity, target, 1 / 60));
      if (position.x > peak) {
        peak = position.x;
        troughAfterPeak = Infinity;
      } else {
        troughAfterPeak = Math.min(troughAfterPeak, position.x);
      }
    }
    near(position.x, RING.reach, 1e-3);
    // Rebasa un poco una vez y no vuelve a quedarse corto de forma visible.
    expect(peak).toBeLessThan(RING.reach * 1.05);
    expect(troughAfterPeak).toBeGreaterThan(RING.reach * 0.99);
  });
});
