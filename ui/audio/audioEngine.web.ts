import { rngFromString } from '../../lib/oracle/rng';
import { SOUND, type Sound, type Strand, type Voice } from './audioConfig';
import { lengthOf, strandFor, voicesFor } from './audioScore';

/**
 * El sintetizador. Todo lo que suena se fabrica aquí, en el momento, con
 * osciladores y ruido filtrado: **no hay ni un solo archivo de audio**, igual
 * que no hay una sola imagen en los sellos ni un motor de física de terceros.
 * El bundle no engorda un byte y no hay nada que descargar.
 *
 * Un solo `AudioContext`, y nace cuando alguien enciende el sonido —nunca
 * antes, porque un contexto creado sin un gesto queda suspendido y porque un
 * archivo que suena sin permiso es un archivo maleducado—. Con la pestaña
 * oculta se suspende; al apagarlo, se cierra.
 *
 * El ruido tampoco es azar del sistema: se rellena con el PRNG sembrado de
 * `lib/oracle/rng`, así que el mismo roce tiene el mismo grano siempre. La
 * regla 3 del proyecto no tiene excepciones, tampoco aquí.
 */

export const SOUND_AVAILABLE = true;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let strand: StrandVoice | null = null;

interface StrandVoice {
  a: OscillatorNode;
  b: OscillatorNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  tremor: GainNode;
  gain: GainNode;
}

type Ctor = typeof AudioContext;

function audioContextCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Dos segundos de ruido blanco, hechos una vez y con semilla. */
function noiseBuffer(context: AudioContext): AudioBuffer {
  if (noise) return noise;
  const frames = Math.floor(context.sampleRate * 2);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = rngFromString('ruido|aracne');
  for (let i = 0; i < frames; i += 1) data[i] = rng() * 2 - 1;
  noise = buffer;
  return buffer;
}

const onVisibility = () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') void ctx.suspend();
  else void ctx.resume();
};

/** Enciende. Debe llamarse desde un gesto: sin él el navegador deja el contexto mudo. */
export async function start(): Promise<boolean> {
  const Ctor = audioContextCtor();
  if (!Ctor) return false;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = SOUND.master;
    master.connect(ctx.destination);
    document.addEventListener('visibilitychange', onVisibility);
  }
  try {
    await ctx.resume();
  } catch {
    return false;
  }
  // Si la preferencia venía guardada no hay gesto que valga y el contexto
  // nace mudo. Se despierta con el primero que llegue, sea cual sea.
  if (ctx.state !== 'running') wakeOnGesture();
  return ctx.state === 'running';
}

function wakeOnGesture(): void {
  if (typeof window === 'undefined') return;
  const wake = () => {
    window.removeEventListener('pointerdown', wake, true);
    window.removeEventListener('keydown', wake, true);
    void ctx?.resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', wake, true);
}

/** Apaga: corta el sostenido, suelta el contexto y deja de escuchar nada. */
export function stop(): void {
  endStrand();
  if (!ctx) return;
  document.removeEventListener('visibilitychange', onVisibility);
  const dying = ctx;
  ctx = null;
  master = null;
  noise = null;
  void dying.close().catch(() => undefined);
}

/**
 * Sobre de percusión: sube rápido y cae exponencialmente, que es como cae
 * todo lo que golpea algo. La rampa exponencial no puede pasar por cero, de
 * ahí el suelo de 1e-4.
 */
function envelope(gain: GainNode, at: number, peak: number, attack: number, decay: number): void {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

/** El temblor: un oscilador lento que muerde la amplitud. Devuelve el nodo que hay que atravesar. */
function tremorNode(context: AudioContext, at: number, hz: number, amount: number): {
  node: GainNode;
  lfo: OscillatorNode | null;
} {
  const node = context.createGain();
  if (hz <= 0 || amount <= 0) {
    node.gain.value = 1;
    return { node, lfo: null };
  }
  node.gain.value = 1 - amount;
  const lfo = context.createOscillator();
  lfo.frequency.value = hz;
  const lfoGain = context.createGain();
  lfoGain.gain.value = amount;
  lfo.connect(lfoGain).connect(node.gain);
  lfo.start(at);
  return { node, lfo };
}

function playVoice(context: AudioContext, out: GainNode, v: Voice, at: number): void {
  const env = context.createGain();
  const { node: trem, lfo } = tremorNode(context, at, v.tremor, v.tremorDepth);
  const life = v.attack + v.decay;
  const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];

  if (v.wave === 'noise') {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context);
    source.loop = true;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = v.freq;
    band.Q.value = v.q;
    source.connect(band).connect(trem);
    sources.push(source);
  } else {
    const a = context.createOscillator();
    a.type = v.wave;
    a.frequency.value = v.freq;
    a.connect(trem);
    sources.push(a);
    if (v.detune !== 0) {
      const b = context.createOscillator();
      b.type = v.wave;
      b.frequency.value = v.freq;
      b.detune.value = v.detune;
      b.connect(trem);
      sources.push(b);
    }
  }

  trem.connect(env).connect(out);
  envelope(env, at, v.gain, v.attack, v.decay);

  for (const source of sources) {
    source.start(at);
    source.stop(at + life + 0.05);
  }
  const last = sources[sources.length - 1];
  last.onended = () => {
    for (const source of sources) source.disconnect();
    lfo?.stop();
    lfo?.disconnect();
    trem.disconnect();
    env.disconnect();
  };
  if (lfo) lfo.stop(at + life + 0.05);
}

export function play(sound: Sound, quiet: boolean): void {
  if (!ctx || !master || ctx.state !== 'running') return;
  const at = ctx.currentTime + 0.001;
  const voices = voicesFor(sound, quiet);
  // Nada que dure más que su propia cola: el motor no guarda voces vivas.
  if (lengthOf(voices) <= 0) return;
  for (const v of voices) playVoice(ctx, master, v, at);
}

function applyStrand(target: Strand, immediate: boolean): void {
  if (!ctx || !strand) return;
  const at = ctx.currentTime;
  const glide = immediate ? 0.005 : SOUND.seda.glide;
  strand.a.frequency.setTargetAtTime(target.freq, at, glide);
  strand.b.frequency.setTargetAtTime(target.freq, at, glide);
  strand.filter.frequency.setTargetAtTime(target.cutoff, at, glide);
  strand.gain.gain.setTargetAtTime(target.gain, at, glide);
  strand.lfo.frequency.setTargetAtTime(Math.max(0.01, target.tremor), at, glide);
  strand.lfoGain.gain.setTargetAtTime(target.tremorDepth, at, glide);
  strand.tremor.gain.setTargetAtTime(1 - target.tremorDepth, at, glide);
}

/** Empieza el sostenido de la seda. Si ya sonaba, solo se mueve. */
export function beginStrand(strain: number, leg: number, ringSize: number, quiet: boolean): void {
  if (!ctx || !master || ctx.state !== 'running') return;
  const target = strandFor(strain, leg, ringSize, quiet);
  if (strand) {
    applyStrand(target, false);
    return;
  }
  const at = ctx.currentTime;
  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  a.type = 'triangle';
  b.type = 'triangle';
  b.detune.value = SOUND.seda.detune;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.9;

  const tremor = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.connect(lfoGain).connect(tremor.gain);

  const gain = ctx.createGain();
  gain.gain.value = 0.0001;

  a.connect(filter);
  b.connect(filter);
  filter.connect(tremor).connect(gain).connect(master);

  a.start(at);
  b.start(at);
  lfo.start(at);
  strand = { a, b, filter, lfo, lfoGain, tremor, gain };
  applyStrand(target, true);
}

export function moveStrand(strain: number, leg: number, ringSize: number, quiet: boolean): void {
  if (!strand) return;
  applyStrand(strandFor(strain, leg, ringSize, quiet), false);
}

/** Corta el sostenido. No de golpe: un corte seco chasquea, y ese chasquido no es el nuestro. */
export function endStrand(): void {
  if (!ctx || !strand) {
    strand = null;
    return;
  }
  const dying = strand;
  strand = null;
  const at = ctx.currentTime;
  dying.gain.gain.cancelScheduledValues(at);
  dying.gain.gain.setValueAtTime(Math.max(0.0002, dying.gain.gain.value), at);
  dying.gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  dying.a.stop(at + 0.14);
  dying.b.stop(at + 0.14);
  dying.lfo.stop(at + 0.14);
  dying.b.onended = () => {
    dying.a.disconnect();
    dying.b.disconnect();
    dying.filter.disconnect();
    dying.lfo.disconnect();
    dying.lfoGain.disconnect();
    dying.tremor.disconnect();
    dying.gain.disconnect();
  };
}
