import { RING, threadFrequency, type Ring } from '../../lib/aleph/tension';
import { rngFromString } from '../../lib/oracle/rng';
import { SOUND, type Sound, type Strand, type Voice } from './audioConfig';

/**
 * La partitura: de un suceso a las voces que lo dicen. Aritmética pura, sin
 * Web Audio y sin DOM, así que se prueba en Node igual que `spiderMotion`.
 *
 * Dos reglas del proyecto mandan aquí y se ven en el código:
 *
 * 1. **Ninguna frecuencia se elige a oído.** La nota de una pata es su propia
 *    `threadFrequency()` subida hasta donde se oye, y las parciales de un
 *    dictamen salen de la semilla por `rngFromString()`. Nada de `Math.random()`:
 *    la misma URL suena igual en cualquier máquina, hoy y dentro de un año.
 * 2. **Nada dura más de lo que dura el gesto.** La cola más larga es la del
 *    dictamen, y no llega a segundo y medio.
 */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function ringOf(ringSize: number): Ring {
  return { legs: Math.max(1, Math.round(ringSize)), reach: RING.reach };
}

/**
 * La nota de una pata. `threadFrequency()` reparte de 5,5 a 12,5 Hz alrededor
 * del anillo: patas vecinas suenan parecido y lejanas no, que es la misma
 * información que da la distancia angular, por otro canal.
 */
export function legPitch(leg: number, ringSize: number): number {
  return threadFrequency(leg, ringOf(ringSize)) * 2 ** SOUND.hilo.octaves;
}

/** El temblor de una pata: su frecuencia de hilo, tal cual, sin transponer. */
export function legTremor(leg: number, ringSize: number): number {
  return threadFrequency(leg, ringOf(ringSize));
}

function depth(quiet: boolean): number {
  return quiet ? SOUND.quiet.tremorDepth : SOUND.tremorDepth;
}

function tail(seconds: number, quiet: boolean): number {
  return quiet ? seconds * SOUND.quiet.tail : seconds;
}

/**
 * La seda mientras se tira. `strain` es cuánto se ha llevado la mano el
 * cuerpo, de 0 a 1; `leg` es la pata que más tira, y de ella sale el temblor.
 * Cuanto más lejos, más aguda, más brillante y más fuerte: una cuerda.
 */
export function strandFor(strain: number, leg: number, ringSize: number, quiet = false): Strand {
  const t = clamp01(strain);
  return {
    freq: lerp(SOUND.seda.freqLow, SOUND.seda.freqHigh, t),
    cutoff: lerp(SOUND.seda.cutoffLow, SOUND.seda.cutoffHigh, t),
    // Arranca en nada y crece: posar la mano no suena a tirar de ella.
    gain: SOUND.seda.gain * (0.25 + 0.75 * t),
    tremor: legTremor(leg, ringSize),
    tremorDepth: depth(quiet) * t,
  };
}

const voice = (v: Partial<Voice> & Pick<Voice, 'wave' | 'freq' | 'gain' | 'decay'>): Voice => ({
  q: 1,
  attack: 0.004,
  tremor: 0,
  tremorDepth: 0,
  detune: 0,
  ...v,
});

/** Las voces de un suceso suelto. El orden no importa: suenan a la vez. */
export function voicesFor(sound: Sound, quiet = false): Voice[] {
  switch (sound.kind) {
    case 'roce':
      return [
        voice({
          wave: 'noise',
          freq: SOUND.roce.freq,
          q: SOUND.roce.q,
          gain: SOUND.roce.gain,
          attack: SOUND.roce.attack,
          decay: tail(SOUND.roce.decay, quiet),
        }),
        // El cuerpo que hay detrás del roce. Sin esto se oye la uña y no el animal.
        voice({
          wave: 'sine',
          freq: SOUND.roce.tapFreq,
          gain: SOUND.roce.tapGain,
          attack: 0.004,
          decay: tail(SOUND.roce.tapDecay, quiet),
        }),
      ];

    case 'chasquido': {
      const s = clamp01(sound.speed);
      return [
        voice({
          wave: 'noise',
          freq: SOUND.chasquido.freq * (0.8 + 0.6 * s),
          q: SOUND.chasquido.q,
          gain: SOUND.chasquido.gain * (0.45 + 0.55 * s),
          attack: 0.001,
          decay: tail(SOUND.chasquido.decay, quiet),
        }),
        // El sub es el cuerpo, no el golpe: no crece con la prisa.
        voice({
          wave: 'sine',
          freq: SOUND.chasquido.subFreq,
          gain: SOUND.chasquido.subGain,
          attack: 0.006,
          decay: tail(SOUND.chasquido.subDecay, quiet),
        }),
      ];
    }

    case 'hilo': {
      const pitch = legPitch(sound.leg, sound.ringSize);
      const tremor = legTremor(sound.leg, sound.ringSize);
      if (sound.supported) {
        return [
          voice({
            wave: 'triangle',
            freq: pitch,
            gain: SOUND.hilo.gain,
            attack: SOUND.hilo.attack,
            decay: tail(SOUND.hilo.decay, quiet),
            tremor,
            tremorDepth: depth(quiet),
            detune: SOUND.hilo.detune,
          }),
        ];
      }
      return [
        voice({
          wave: 'sine',
          freq: pitch * SOUND.hilo.releaseRatio,
          gain: SOUND.hilo.releaseGain,
          attack: SOUND.hilo.attack,
          decay: tail(SOUND.hilo.releaseDecay, quiet),
        }),
      ];
    }

    case 'dictamen': {
      const rng = rngFromString(`dictamen|${sound.seed}`);
      // Más patas apoyadas: más grave y más larga. El archivo pesa.
      const load = clamp01(sound.legs / 11);
      const base = lerp(SOUND.dictamen.freqHigh, SOUND.dictamen.freqLow, rng() * 0.6 + load * 0.4);
      const voices: Voice[] = [];
      for (let i = 0; i < SOUND.dictamen.partials; i += 1) {
        // Inarmónicas a propósito: metal golpeado, no acorde. Un acorde sería una profecía.
        const wobble = 1 + (rng() - 0.5) * 2 * SOUND.dictamen.inharmonic;
        voices.push(
          voice({
            wave: i === 0 ? 'triangle' : 'sine',
            freq: base * (i + 1) * wobble,
            gain: (SOUND.dictamen.gain * (1 + load * 0.25)) / (i + 1.6),
            attack: SOUND.dictamen.attack,
            decay: tail(SOUND.dictamen.decay * (1 + load * 0.3) * (1 - i * 0.22), quiet),
            detune: i === 0 ? SOUND.dictamen.detune : 0,
          }),
        );
      }
      return voices;
    }
  }
}

/** Lo que tarda un suceso en apagarse del todo. Lo usa el motor para soltar los nodos. */
export function lengthOf(voices: readonly Voice[]): number {
  let longest = 0;
  for (const v of voices) longest = Math.max(longest, v.attack + v.decay);
  return longest;
}
