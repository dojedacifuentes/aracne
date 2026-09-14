/**
 * PRNG sembrado. Toda la aleatoriedad del archivo pasa por aquí: una misma
 * semilla produce la misma secuencia en cualquier dispositivo, y por eso una
 * invocación se puede compartir por URL.
 *
 * Reconstruido en la fase 0: el kit lo daba por escrito, pero no venía.
 * xmur3 convierte el texto en estado; sfc32 genera.
 */

export type Rng = () => number;

/** Texto → secuencia de enteros de 32 bits (xmur3). */
function xmur3(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** sfc32: rápido, bien repartido, 128 bits de estado. Devuelve [0, 1). */
function sfc32(a: number, b: number, c: number, d: number): Rng {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function rngFromString(seed: string): Rng {
  const next = xmur3(seed);
  const rng = sfc32(next(), next(), next(), next());
  // Las primeras salidas arrastran correlación con el estado inicial.
  for (let i = 0; i < 12; i += 1) rng();
  return rng;
}

const SEED_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
export const SEED_LENGTH = 8;

/**
 * Semilla nueva para cada pulsación. Sin `Math.random()`: la entropía sale
 * del instante y de un contador de pulsaciones, y pasa por el mismo PRNG.
 * Dos pulsaciones nunca comparten a la vez instante y contador.
 */
export function freshSeed(now: number, counter: number): string {
  const rng = rngFromString(`semilla|${now}|${counter}`);
  let seed = "";
  for (let i = 0; i < SEED_LENGTH; i += 1) {
    seed += SEED_ALPHABET[Math.floor(rng() * SEED_ALPHABET.length)];
  }
  return seed;
}

/** Lo que se acepta como semilla en una URL. */
export function isSeed(value: string): boolean {
  return /^[0-9a-z]{4,32}$/.test(value);
}
