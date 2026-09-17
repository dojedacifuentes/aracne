import { describe, expect, it } from 'vitest';

import { RING, threadFrequency } from '../lib/aleph/tension';
import { SOUND, type Sound, type Voice } from '../ui/audio/audioConfig';
import { legPitch, legTremor, lengthOf, strandFor, voicesFor } from '../ui/audio/audioScore';

const RING_SIZE = RING.legs;

const todos: Sound[] = [
  { kind: 'roce' },
  { kind: 'chasquido', speed: 0 },
  { kind: 'chasquido', speed: 1 },
  ...Array.from({ length: RING_SIZE }, (_, leg): Sound => ({ kind: 'hilo', leg, ringSize: RING_SIZE, supported: true })),
  ...Array.from({ length: RING_SIZE }, (_, leg): Sound => ({ kind: 'hilo', leg, ringSize: RING_SIZE, supported: false })),
  { kind: 'dictamen', seed: 'qrmk2s8d', legs: 0 },
  { kind: 'dictamen', seed: 'qrmk2s8d', legs: 11 },
];

describe('lo que suena está acotado', () => {
  it('ninguna voz se sale de lo que se oye, ni de lo que dura un gesto', () => {
    for (const quiet of [false, true]) {
      for (const sound of todos) {
        const voices = voicesFor(sound, quiet);
        expect(voices.length).toBeGreaterThan(0);
        for (const v of voices) {
          expect(Number.isFinite(v.freq)).toBe(true);
          // Grave, pero por encima de lo que solo se siente y por debajo del siseo.
          expect(v.freq).toBeGreaterThan(20);
          expect(v.freq).toBeLessThan(3000);
          expect(v.gain).toBeGreaterThan(0);
          expect(v.gain).toBeLessThanOrEqual(1);
          expect(v.attack).toBeGreaterThan(0);
          expect(v.decay).toBeGreaterThan(0);
          expect(v.tremorDepth).toBeGreaterThanOrEqual(0);
          expect(v.tremorDepth).toBeLessThanOrEqual(1);
        }
        // Nada se queda sonando: la cola más larga es la del dictamen.
        expect(lengthOf(voices)).toBeLessThan(1.6);
      }
    }
  });

  it('la suma de todas las voces de un suceso no satura', () => {
    for (const sound of todos) {
      const total = voicesFor(sound).reduce((sum: number, v: Voice) => sum + v.gain, 0);
      expect(total * SOUND.master).toBeLessThan(0.5);
    }
  });
});

describe('la nota de una pata', () => {
  it('es su propia frecuencia de hilo, subida hasta donde se oye', () => {
    for (let leg = 0; leg < RING_SIZE; leg += 1) {
      expect(legTremor(leg, RING_SIZE)).toBeCloseTo(threadFrequency(leg), 12);
      expect(legPitch(leg, RING_SIZE)).toBeCloseTo(threadFrequency(leg) * 2 ** SOUND.hilo.octaves, 9);
    }
    // El anillo ordena las notas: la pata 0 es la más grave y la última, la más aguda.
    expect(legPitch(0, RING_SIZE)).toBeLessThan(legPitch(RING_SIZE - 1, RING_SIZE));
  });

  it('soltarla suena más abajo, más floja y más corta que apoyarla', () => {
    const apoyar = voicesFor({ kind: 'hilo', leg: 4, ringSize: RING_SIZE, supported: true })[0];
    const soltar = voicesFor({ kind: 'hilo', leg: 4, ringSize: RING_SIZE, supported: false })[0];
    expect(soltar.freq).toBeLessThan(apoyar.freq);
    expect(soltar.gain).toBeLessThan(apoyar.gain);
    expect(soltar.decay).toBeLessThan(apoyar.decay);
  });

  it('un anillo de otro tamaño no rompe nada', () => {
    for (const size of [1, 3, 7, 23]) {
      const voices = voicesFor({ kind: 'hilo', leg: size - 1, ringSize: size, supported: true });
      expect(Number.isFinite(voices[0].freq)).toBe(true);
      expect(voices[0].freq).toBeGreaterThan(20);
    }
  });
});

describe('el dictamen sale de la semilla', () => {
  it('la misma semilla suena igual, siempre', () => {
    const a = voicesFor({ kind: 'dictamen', seed: 'delyra00', legs: 3 });
    const b = voicesFor({ kind: 'dictamen', seed: 'delyra00', legs: 3 });
    expect(b).toEqual(a);
    // Compartir la URL es compartir el sonido: eso es lo que lo hace del archivo.
    expect(a).toHaveLength(SOUND.dictamen.partials);
  });

  it('dos semillas distintas no suenan igual', () => {
    const a = voicesFor({ kind: 'dictamen', seed: 'aaaaaaaa', legs: 3 });
    const b = voicesFor({ kind: 'dictamen', seed: 'bbbbbbbb', legs: 3 });
    expect(b[0].freq).not.toBeCloseTo(a[0].freq, 3);
  });

  it('las parciales son inarmónicas: metal golpeado, no un acorde', () => {
    const voices = voicesFor({ kind: 'dictamen', seed: 'delyra00', legs: 5 });
    const base = voices[0].freq;
    for (let i = 1; i < voices.length; i += 1) {
      const ratio = voices[i].freq / base;
      // Cerca del múltiplo entero, pero nunca clavado en él.
      expect(Math.abs(ratio - (i + 1))).toBeLessThan((i + 1) * SOUND.dictamen.inharmonic * 2.2);
      expect(ratio).not.toBeCloseTo(i + 1, 6);
    }
  });

  it('con las once patas apoyadas pesa más que sin ninguna', () => {
    const vacio = voicesFor({ kind: 'dictamen', seed: 'delyra00', legs: 0 });
    const lleno = voicesFor({ kind: 'dictamen', seed: 'delyra00', legs: 11 });
    expect(lleno[0].freq).toBeLessThan(vacio[0].freq);
    expect(lleno[0].decay).toBeGreaterThan(vacio[0].decay);
  });
});

describe('la seda mientras se tira', () => {
  it('cuanto más lejos, más aguda, más brillante y más fuerte', () => {
    let previous = strandFor(0, 0, RING_SIZE);
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const now = strandFor(t, 0, RING_SIZE);
      expect(now.freq).toBeGreaterThan(previous.freq);
      expect(now.cutoff).toBeGreaterThan(previous.cutoff);
      expect(now.gain).toBeGreaterThan(previous.gain);
      previous = now;
    }
  });

  it('no se sale de su rango por mucho que se tire', () => {
    for (const t of [-5, 0, 0.5, 1, 40]) {
      const s = strandFor(t, 3, RING_SIZE);
      expect(s.freq).toBeGreaterThanOrEqual(SOUND.seda.freqLow);
      expect(s.freq).toBeLessThanOrEqual(SOUND.seda.freqHigh);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThanOrEqual(SOUND.seda.gain);
      expect(s.tremorDepth).toBeLessThanOrEqual(SOUND.tremorDepth);
    }
  });

  it('el temblor es el del hilo de la pata que tira', () => {
    expect(strandFor(1, 6, RING_SIZE).tremor).toBeCloseTo(threadFrequency(6), 12);
  });
});

describe('sin movimiento', () => {
  it('sigue sonando, pero no parpadea y las colas se acortan', () => {
    for (const sound of todos) {
      const normal = voicesFor(sound, false);
      const quieto = voicesFor(sound, true);
      for (let i = 0; i < normal.length; i += 1) {
        expect(quieto[i].tremorDepth).toBe(0);
        expect(quieto[i].decay).toBeLessThan(normal[i].decay + 1e-12);
        // Lo que se oye no desaparece: solo dura menos.
        expect(quieto[i].gain).toBe(normal[i].gain);
        expect(quieto[i].freq).toBe(normal[i].freq);
      }
    }
    expect(strandFor(1, 0, RING_SIZE, true).tremorDepth).toBe(0);
  });
});
