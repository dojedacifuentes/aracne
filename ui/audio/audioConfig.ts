/**
 * El archivo suena, y todo lo ajustable está aquí. Este archivo no importa
 * Web Audio, ni three, ni React: lo leen el sintetizador, la partitura y las
 * pruebas.
 *
 * La regla de la voz vale también para el oído. Nada de acordes de destino,
 * nada de reverberación de cripta, ningún golpe que anuncie algo. Lo que se
 * oye es físico y está cerca: quitina contra quitina, una seda que se tensa,
 * un hilo que se suelta. El miedo, si aparece, es el de tener algo vivo a dos
 * centímetros, no el de una película.
 *
 * Y el silencio manda: esto nace apagado y se enciende a mano.
 */

export type Wave = 'sine' | 'triangle' | 'sawtooth' | 'noise';

/** Un golpe: nace, suena y se apaga solo. */
export interface Voice {
  wave: Wave;
  /** Hz. Con `noise`, el centro del filtro de banda. */
  freq: number;
  /** Agudeza del filtro. Solo cuenta con `noise`. */
  q: number;
  /** 0 a 1, antes de la ganancia general. */
  gain: number;
  attack: number;
  decay: number;
  /** Temblor: modulación de amplitud, en Hz. 0 la apaga. */
  tremor: number;
  /** Cuánto muerde ese temblor, de 0 a 1. */
  tremorDepth: number;
  /** Segundo oscilador desafinado, en cents. 0 deja uno solo. */
  detune: number;
}

/** El sostenido de la seda mientras la mano tira: no nace ni muere, se desliza. */
export interface Strand {
  freq: number;
  /** Corte del paso bajo: cuanto más se tira, más brillo tiene la cuerda. */
  cutoff: number;
  gain: number;
  tremor: number;
  tremorDepth: number;
}

/** Lo que puede sonar. Cada uno sale de algo que ya existía en el motor. */
export type Sound =
  /** La mano se posa sobre el animal. */
  | { kind: 'roce' }
  /** La mano se levanta. `speed` de 0 a 1. */
  | { kind: 'chasquido'; speed: number }
  /** Una pata se apoya o se suelta: su hilo suena a su propia frecuencia. */
  | { kind: 'hilo'; leg: number; ringSize: number; supported: boolean }
  /** La invocación. Las parciales salen de la semilla: la misma URL suena igual. */
  | { kind: 'dictamen'; seed: string; legs: number };

export const SOUND = {
  /** Ganancia general. Por debajo de lo que molesta en unos cascos. */
  master: 0.22,

  /**
   * Quitina contra quitina, y debajo el golpe sordo del cuerpo.
   *
   * La banda es ancha a propósito. La primera versión filtraba a Q = 7 y
   * medida sobre el propio bus daba 0,0005 de RMS: estaba, pero no se oía.
   * Un filtro estrecho sobre ruido tira casi toda la energía, y ochenta
   * milisegundos no dan tiempo a recuperarla. Con la banda abierta suena a
   * lo que es —algo seco que toca algo seco— en vez de a un silbido.
   */
  roce: {
    freq: 340,
    q: 1.8,
    gain: 0.9,
    attack: 0.002,
    decay: 0.09,
    tapFreq: 72,
    tapGain: 0.4,
    tapDecay: 0.11,
  },

  /**
   * La seda. Dos osciladores casi afinados, que baten despacio, tras un paso
   * bajo que se abre con la tensión. El temblor es la frecuencia del hilo de
   * la pata que más tira: entre 5 y 13 Hz, justo donde un sonido deja de ser
   * una nota y empieza a ser un bicho.
   */
  seda: {
    freqLow: 52,
    freqHigh: 98,
    cutoffLow: 190,
    cutoffHigh: 760,
    gain: 0.3,
    detune: 11,
    /** Segundos de deslizamiento hacia el valor nuevo. */
    glide: 0.07,
  },

  /** Al soltar: el golpe seco de la cuerda y un sub que se va debajo. */
  chasquido: {
    freq: 148,
    q: 4,
    gain: 0.5,
    decay: 0.44,
    subFreq: 43,
    subGain: 0.34,
    subDecay: 0.32,
  },

  /**
   * El hilo de una pata. `threadFrequency()` da de 5,5 a 12,5 Hz: subida cinco
   * octavas cae entre 176 y 400 Hz, que se oye y sigue siendo grave. La nota
   * de cada pata es, literalmente, la vibración de su hilo.
   */
  hilo: {
    octaves: 5,
    gain: 0.2,
    attack: 0.004,
    decay: 0.5,
    detune: 7,
    /** Soltarla suena más abajo, más sordo y más corto que apoyarla. */
    releaseRatio: 0.5,
    releaseGain: 0.13,
    releaseDecay: 0.3,
  },

  /**
   * El dictamen. Tres parciales graves e inarmónicas —metal golpeado, no
   * acorde— sacadas de la semilla con el PRNG del oráculo. Cuantas más patas
   * apoyadas, más grave y más larga: el archivo pesa.
   */
  dictamen: {
    partials: 3,
    freqLow: 46,
    freqHigh: 104,
    gain: 0.3,
    attack: 0.018,
    decay: 1.15,
    /** Cuánto se apartan las parciales de los múltiplos exactos, de 0 a 1. */
    inharmonic: 0.09,
    detune: 5,
  },

  /** Profundidad del temblor cuando lo hay. */
  tremorDepth: 0.34,

  /**
   * Con `prefers-reduced-motion` no se apaga el sonido —no es movimiento—,
   * pero sí lo que parpadea: el temblor se va a cero y las colas se acortan.
   * Una modulación de ocho por segundo es un estroboscopio para el oído.
   */
  quiet: { tremorDepth: 0, tail: 0.45 },
} as const;

/**
 * Lo que el gesto sobre la araña puede hacer sonar. Lo arma quien sabe qué
 * patas hay apoyadas —`Spider`—, porque el que mide la mano no lo sabe.
 */
export interface GrabVoice {
  /** La mano se posa. */
  touch(): void;
  /** Tira: `strain` de 0 a 1, medido en anchuras del propio objetivo. */
  pull(strain: number): void;
  /** Suelta: `speed` de 0 a 1. */
  drop(speed: number): void;
}

/** Dónde se recuerda el conmutador. */
export const SOUND_KEY = 'aracne.sonido';
