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
