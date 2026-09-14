import { describe, expect, it } from 'vitest';

import { freshSeed, isSeed, rngFromString } from '../lib/oracle/rng';

describe('PRNG sembrado', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = rngFromString('aracne');
    const b = rngFromString('aracne');
    for (let i = 0; i < 200; i += 1) expect(a()).toBe(b());
  });

  it('semillas casi iguales divergen', () => {
    const a = rngFromString('aracne');
    const b = rngFromString('aracnf');
    expect(Array.from({ length: 8 }, () => a())).not.toEqual(Array.from({ length: 8 }, () => b()));
  });

  it('siempre en [0, 1)', () => {
    const rng = rngFromString('rango');
    for (let i = 0; i < 2000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('cada pulsación trae una semilla nueva y válida para la URL', () => {
    const seeds = new Set<string>();
    for (let counter = 0; counter < 200; counter += 1) {
      const seed = freshSeed(1_789_000_000_000, counter);
      expect(isSeed(seed)).toBe(true);
      seeds.add(seed);
    }
    expect(seeds.size).toBe(200);
    expect(freshSeed(42, 7)).toBe(freshSeed(42, 7));
  });
});
