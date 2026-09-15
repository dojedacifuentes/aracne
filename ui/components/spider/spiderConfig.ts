/**
 * Todo lo ajustable de la araña, en un solo sitio. Los valores por defecto
 * buscan que el movimiento se note poco: si una cifra la vuelve caricaturesca,
 * está mal elegida.
 *
 * Este archivo no importa three ni React: lo leen la escena 3D, el fallback
 * SVG y las pruebas.
 */

export type Vec3 = readonly [number, number, number];

export interface SpiderOptions {
  /** Punto de reposo en el escenario, normalizado: [0, 0] arriba a la izquierda. */
  position: readonly [number, number];
  /** Multiplica el tamaño base (`SCENE.span`). */
  scale: number;
  /** Rotación añadida a la orientación de reposo, en radianes. */
  rotation: Vec3;
  visible: boolean;
  /** 0: quieta. 1: el micro movimiento previsto. */
  motionIntensity: number;
  /** Multiplica las frecuencias del movimiento ambiental y acorta la entrada. */
  speed: number;
  silk: boolean;
  /** 'top': el hilo nace por encima del borde superior. Un número: alturas de escenario sobre la araña. */
  silkLength: 'top' | number;
  silkOpacity: number;
  /** Curvatura del hilo, en fracción de su longitud. */
  silkSlack: number;
  /** 'descend': baja desde fuera del escenario. 'none': aparece en su sitio. */
  entrance: 'descend' | 'none';
  /** Segundos, aproximados, que tarda en llegar. */
  entranceDuration: number;
}

export const SPIDER_DEFAULTS: SpiderOptions = {
  position: [0.5, 0.55],
  scale: 1,
  rotation: [0, 0, 0],
  visible: true,
  motionIntensity: 1,
  speed: 1,
  silk: true,
  silkLength: 'top',
  silkOpacity: 0.5,
  silkSlack: 0.012,
  entrance: 'descend',
  entranceDuration: 4.5,
};

/** Lo que la escena 3D necesita saber de la aplicación. */
export interface SpiderSceneProps {
  options: SpiderOptions;
  /** Patas apoyadas, por su posición en el anillo. */
  legs: readonly number[];
  /** Número de patas del anillo: sale del contenido, nunca se fija aquí. */
  ringSize: number;
  reduceMotion: boolean;
  /** Cambia con cada pulsación: dispara el gesto de pupila. */
  pressToken: number;
  /** Cursor sobre la araña (solo con ratón). */
  hover: boolean;
  /** La escena escribe aquí lo que el gesto puede pedirle. Ver `SpiderHandle`. */
  handle: SpiderHandleRef;
  /** Sin WebGL, sin modelo o con el contexto perdido: vuelve el fallback. */
  onFailure: () => void;
}

/** Se sirve desde public/: no viaja en el bundle y solo se pide al usarse. */
export const SPIDER_MODEL_URL = '/models/spider/huntsman-spider.glb';

/**
 * Orientación de reposo del modelo optimizado, en orden ZYX: primero +90° en X
 * lleva el dorso hacia quien mira (en el GLB mira hacia +Y); después +90° en Z
 * pone el abdomen, que queda en +X, hacia arriba. Así cuelga cabeza abajo,
 * como una araña bajando por su hilo. Ajustada mirando la escena.
 */
export const MODEL_ORIENTATION: Vec3 = [Math.PI / 2, 0, Math.PI / 2];

/**
 * Dónde nace la seda: la punta del abdomen, en coordenadas del modelo ya
 * orientado y normalizado (lado mayor = 1). Medida sobre una captura.
 */
export const SILK_ATTACH: Vec3 = [0.07, 0.17, 0];

export const SCENE = {
  fov: 30,
  /** Lado mayor de la araña respecto al lado corto del escenario. */
  span: 0.46,
  /** Tope de densidad de píxeles: con ratón y en pantallas táctiles. */
  maxDprFine: 2,
  maxDprCoarse: 1.5,
  /** Luz de relleno, principal (cálida, baja) y de contorno. */
  light: { fill: 0.55, key: 2.6, rim: 1.5 },
} as const;

export const MOTION = {
  /** Péndulo alrededor del anclaje: amplitud (rad) y frecuencia (rad/s). */
  swayAngle: 0.012,
  swayFrequency: 0.55,
  /** Elasticidad del hilo, en fracciones de envergadura. */
  bob: 0.008,
  bobFrequency: 1.05,
  /** Torsión del hilo: amplitud (rad) y frecuencia, del orden del giro del Aleph. */
  twist: 0.26,
  twistFrequency: 0.06,
  /** Vaivén de la seda, en fracción de su longitud, y sus dos frecuencias. */
  silkSway: 0.006,
  silkSwayX: 0.8,
  silkSwayZ: 0.6,
  /** Cuánto trepa por el hilo con el cursor encima, en envergaduras. */
  retreat: 0.1,
  /** Paralaje de cámara con el cursor, en alturas de escenario. */
  parallax: 0.02,
  /** Gesto de pupila: se contrae un 8 % y vuelve en 180 ms. */
  pressScale: 0.92,
  pressMs: 180,
  /** Radios de `alephState()` → medias envergaduras de desplazamiento. */
  tensionReach: 1.6,
} as const;

/**
 * El hilo de cada pata apoyada: sale de la araña hacia el ángulo de su pata en
 * el anillo. Al apoyarla vibra a `threadFrequency()` y se amortigua en unos
 * 700 ms (e^(−0,7 / 0,23) ≈ 5 %); al soltarla, se afloja y se apaga.
 */
export const THREAD = {
  opacity: 0.22,
  fadeIn: 0.12,
  fadeOut: 0.35,
  /** Amplitud de la vibración, en fracción de la longitud del hilo. */
  amplitude: 0.03,
  /** Constante de caída de la vibración, en segundos. */
  decay: 0.23,
  /** Holgura al soltarse, en fracción de la longitud. */
  slack: 0.05,
} as const;

/**
 * Manipular el animal: pulsarlo, tirar de él y soltarlo.
 *
 * Todo lo que mide espacio va en envergaduras y todo lo que mide tiempo, en
 * segundos; el único píxel que llega hasta aquí es el umbral del gesto, que es
 * una cifra de la mano y no del mundo. El muelle al soltar no está: son las
 * constantes del anillo de `lib/aleph/tension.ts`, que están poco amortiguadas
 * y por eso el cuerpo pasa de largo y vuelve oscilando.
 */
export const GRIP = {
  /** Píxeles de recorrido antes de que pulsar se convierta en tirar. */
  dragThreshold: 6,
  /** Cuánto dura, en ms, el recuerdo de un tirón: el clic que llega detrás no invoca. */
  clickGraceMs: 350,
  /** Reparto del gesto táctil: la página se recorre a lo alto, el animal se lleva a lo ancho. */
  touchAction: 'pan-y',
  /** Tope al que tiende el desplazamiento, en envergaduras. La curva nunca lo alcanza. */
  dragReach: 0.85,
  /** Muelle mientras la mano sujeta: crítico (2·√170 ≈ 26), sigue al dedo sin temblar. */
  holdStiffness: 170,
  holdDamping: 26,
  /**
   * Muelle mientras dura el retroceso, y solo mientras dura. La rigidez es la
   * del anillo; lo que baja es la amortiguación, de 14 a 9 (ζ = 0,47 en vez de
   * 0,74). Con las del anillo, medido sobre el lienzo, el cuerpo se pasaba de
   * su sitio dos píxeles: eso no es un retroceso, es un redondeo. Con estas se
   * pasa un décimo de envergadura y está quieto antes de un segundo. En cuanto
   * se para vuelven las del anillo: que una pata tire no es que alguien tire.
   */
  releaseStiffness: 90,
  releaseDamping: 9,
  /** Del gesto al golpe: qué parte de la velocidad del puntero se conserva al soltar. */
  releaseImpulse: 0.7,
  /** Tope de la velocidad heredada, en envergaduras por segundo. */
  maxSpeed: 4.5,
  /** Compresión mientras se sujeta, y en cuánto llega y se va. */
  pressDepth: 0.035,
  pressSmooth: 0.09,
  /** Empujón al pulsar fuera del centro, en envergaduras por segundo. El cuerpo se aparta del dedo y la inclinación sale sola. */
  pressNudge: 0.7,
  /** Cuánto se apaga el péndulo mientras la mano lo sujeta, de 0 a 1. */
  ambientHold: 0.7,
  /** Muestreo del puntero: dt acotado, mezcla con la medida anterior y caída si la mano se para. */
  sampleMinMs: 8,
  sampleMaxMs: 40,
  sampleBlend: 0.6,
  staleMs: 70,
  /** Cuánto se tensa la seda al alejarse del anclaje, en veces el estiramiento. */
  silkTaut: 3,
  /** Cuánto se afloja el hilo de una pata cuando el cuerpo se acerca a ella. */
  threadSag: 0.35,
} as const;

/**
 * El canal entre el gesto y la escena. `Spider` monta el botón y mide la mano;
 * `SpiderScene` traduce píxeles a mundo y llama al rig. Van por una referencia
 * y no por props para que arrastrar no vuelva a renderizar nada.
 *
 * Las coordenadas son píxeles de cliente y la velocidad, píxeles por segundo:
 * quien los recibe sabe dónde está el lienzo, y quien los emite no.
 */
export interface SpiderHandle {
  beginGrab(clientX: number, clientY: number): void;
  dragTo(clientX: number, clientY: number): void;
  release(vx: number, vy: number): void;
  cancel(): void;
}

/** Estructuralmente, la referencia de React; se declara aquí para no importarlo. */
export interface SpiderHandleRef {
  current: SpiderHandle | null;
}

/** Lo que el gesto devuelve al componente que monta el botón. */
export interface SpiderGrab {
  /** Se engancha al elemento que se pulsa. En nativo no hay nada que enganchar. */
  attach?: (node: unknown) => void;
  /** Si el gesto que acaba de terminar fue un tirón, no era una invocación. */
  wasDrag: () => boolean;
}
