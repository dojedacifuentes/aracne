/**
 * Genera los assets sintéticos del proyecto: cuatro sonidos y una textura de grano.
 *
 *   node scripts/generate-assets.mjs
 *
 * Todo se sintetiza aquí para que el repositorio no dependa de descargas ni
 * de bancos de sonido externos. Los archivos resultantes se versionan.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = join(ROOT, 'assets', 'audio');

/** Los toques breves tienen contenido brillante y necesitan 22 kHz. */
const RATE = 22050;

/**
 * El ambiente no pasa de unos 250 Hz: a 8 kHz suena idéntico y pesa un tercio.
 * Es la única compresión posible sin añadir un codificador al proyecto.
 */
const AMBIENT_RATE = 8000;

/** PRNG determinista: los assets deben ser reproducibles. */
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

function writeWav(name, samples, rate = RATE) {
  const count = samples.length;
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + count * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32000), 44 + i * 2);
  }
  writeFileSync(join(AUDIO_DIR, name), buffer);
  console.log(`${name}  ${(buffer.length / 1024).toFixed(0)} KB`);
}

/** Un golpe resonante: parciales con ataque suave y caída exponencial. */
function resonance({ seconds, partials, attack, decay, air = 0, seed = 7 }) {
  const total = Math.floor(seconds * RATE);
  const out = new Float32Array(total);
  const noise = rng(seed);
  let lowpass = 0;
  for (let i = 0; i < total; i += 1) {
    const t = i / RATE;
    const envelope =
      (1 - Math.exp(-t / attack)) * Math.exp(-t / decay) * Math.min(1, (total - i) / (RATE * 0.08));
    let value = 0;
    for (const [frequency, gain, detune] of partials) {
      value += gain * Math.sin(2 * Math.PI * (frequency + detune) * t);
    }
    if (air > 0) {
      lowpass += (noise() * 2 - 1 - lowpass) * 0.08;
      value += lowpass * air;
    }
    out[i] = value * envelope;
  }
  return out;
}

/**
 * Ambiente: drones y aire. Todas las frecuencias son múltiplos de 1/duración,
 * así el bucle cierra sin costura; el ruido se cruza consigo mismo al final.
 */
function ambient({ seconds = 32, seed = 19 } = {}) {
  const total = Math.floor(seconds * AMBIENT_RATE);
  const fade = Math.floor(1.5 * AMBIENT_RATE);
  const raw = new Float32Array(total + fade);
  const noise = rng(seed);
  // Ajusta cualquier frecuencia al múltiplo exacto de 1/duración más cercano.
  const snap = (hz) => Math.round(hz * seconds) / seconds;
  const cycle = (n) => n / seconds;
  const voices = [
    [snap(55), 0.16, cycle(1)],
    [snap(82.5), 0.09, cycle(2)],
    [snap(110), 0.07, cycle(3)],
    [snap(165), 0.04, cycle(2)],
    [snap(220), 0.025, cycle(1)],
  ];
  // El pasa-bajos se define por frecuencia de corte, no por coeficiente fijo:
  // así suena igual sea cual sea la frecuencia de muestreo.
  const alpha = (hz) => 1 - Math.exp((-2 * Math.PI * hz) / AMBIENT_RATE);
  const cut = alpha(70);
  let low = 0;
  let lower = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const t = i / AMBIENT_RATE;
    let value = 0;
    for (const [frequency, gain, lfo] of voices) {
      const breath = 0.65 + 0.35 * Math.sin(2 * Math.PI * lfo * t);
      value += gain * breath * Math.sin(2 * Math.PI * frequency * t);
    }
    // Dos pasa-bajos en cascada: ruido marino abstracto, sin nada reconocible.
    low += (noise() * 2 - 1 - low) * cut;
    lower += (low - lower) * cut;
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * cycle(1) * t + 1.2);
    value += lower * 1.8 * swell;
    raw[i] = value * 0.85;
  }
  // Cruce del sobrante sobre el inicio para que el bucle sea continuo.
  const out = new Float32Array(total);
  out.set(raw.subarray(0, total));
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    out[i] = out[i] * k + raw[total + i] * (1 - k);
  }
  return out;
}

/** Grano: una teselita de ruido para que los degradados no se vean perfectos. */
function writeGrain(name, size = 96, seed = 41) {
  const noise = rng(seed);
  const pixels = Buffer.alloc(size * size * 4);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const level = 150 + Math.floor(noise() * 105);
      pixels[offset] = level;
      pixels[offset + 1] = level;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = 40 + Math.floor(noise() * 90);
      offset += 4;
    }
  }
  const bytes = writePng(join(ROOT, 'assets', name), size, size, pixels);
  console.log(`${name}  ${(bytes / 1024).toFixed(1)} KB`);
}

mkdirSync(AUDIO_DIR, { recursive: true });

// Apertura: resonancia aérea y cristalina.
writeWav(
  'opening.wav',
  resonance({
    seconds: 2.0,
    attack: 0.06,
    decay: 0.55,
    air: 0.05,
    seed: 3,
    partials: [
      [396, 0.3, 0],
      [594, 0.18, 0.4],
      [792, 0.12, -0.3],
      [1188, 0.06, 0.7],
    ],
  }),
);

// Cielo: una campana breve, casi un chasquido de cristal.
writeWav(
  'sky.wav',
  resonance({
    seconds: 0.8,
    attack: 0.004,
    decay: 0.16,
    seed: 5,
    partials: [
      [1174, 0.24, 0],
      [1760, 0.12, 0.5],
      [2637, 0.05, -0.8],
    ],
  }),
);

// Conjetura: más grave, más cálida, más lenta. Lleva su propio eco.
writeWav(
  'conjecture.wav',
  resonance({
    seconds: 1.8,
    attack: 0.09,
    decay: 0.5,
    air: 0.03,
    seed: 11,
    partials: [
      [174, 0.32, 0],
      [261, 0.2, 0.2],
      [348, 0.11, -0.2],
      [522, 0.05, 0.4],
    ],
  }),
);

/**
 * Firma de dualidad: cada sonido de la aplicación lleva un par. No es un
 * «modo Géminis» ni se anuncia; simplemente nada suena solo del todo.
 * Aquí el par son dos fundamentales muy próximas, que baten lentamente entre
 * sí, más un reflejo retrasado unos milisegundos.
 */
function twinned({ seconds, base, spread, attack, decay, echoMs, echoGain, air = 0, seed = 23 }) {
  const primary = resonance({
    seconds,
    attack,
    decay,
    air,
    seed,
    partials: [
      [base, 0.3, 0],
      [base + spread, 0.26, 0],
      [base * 2, 0.1, 0.3],
      [base * 3, 0.04, -0.4],
    ],
  });
  const out = new Float32Array(primary.length);
  const delay = Math.floor((echoMs / 1000) * RATE);
  for (let i = 0; i < primary.length; i += 1) {
    out[i] = primary[i] + (i >= delay ? primary[i - delay] * echoGain : 0);
  }
  return out;
}

// Tocar la Luna: cristal grave. No es un clic; es tocar un objeto extraño.
writeWav(
  'moon.wav',
  twinned({
    seconds: 0.5,
    base: 196,
    spread: 3.5,
    attack: 0.006,
    decay: 0.12,
    echoMs: 46,
    echoGain: 0.36,
    air: 0.02,
    seed: 17,
  }),
);

// El susurro: fundamental, armónico y una cola larga.
writeWav(
  'secret.wav',
  twinned({
    seconds: 2.6,
    base: 147,
    spread: 2.2,
    attack: 0.12,
    decay: 0.7,
    echoMs: 130,
    echoGain: 0.3,
    air: 0.025,
    seed: 29,
  }),
);

// Ambiente: bucle continuo, sin melodía ni ritmo.
writeWav('ambient.wav', ambient(), AMBIENT_RATE);

writeGrain('grain.png');
