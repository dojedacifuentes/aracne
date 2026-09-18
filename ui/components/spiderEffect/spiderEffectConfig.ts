import type { colors } from '../../theme';

/** Un color, por su nombre en `theme.ts`: fuera de la paleta no se puede escribir ninguno. */
export type ColorToken = keyof typeof colors;

/**
 * Todo lo ajustable de la entidad, en un solo sitio.
 *
 * La entidad es lo que camina por la red detrás de quien lee: sigue al cursor
 * con retraso, se mueve sola cuando la mano se para, nota lo que se puede
 * tocar y tiende hilos hacia las entradas que tiene cerca. Reglas y razones en
 * `docs/ENTIDAD.md`.
 *
 * Los valores por defecto buscan que se note poco. Si una cifra la vuelve
 * visible desde el otro lado de la habitación, está mal elegida: tiene que
 * verse cuando uno se para, no antes.
 *
 * Este archivo no importa React ni toca el DOM, y del tema solo toma el tipo:
 * lo leen el componente web y las pruebas.
 */

/** Lo que sabe hacer. Cada una se apaga por separado. */
export type Interaction = 'follow' | 'idle' | 'proximity' | 'threads' | 'web';

export interface EntityConfig {
  /** Interruptor maestro. Apagado no se monta nada: ni lienzo, ni bucle, ni oyentes. */
  enabled: boolean;
  /** Semilla del PRNG: la misma tela y los mismos gestos en cualquier máquina. */
  seed: string;
  interactions: Record<Interaction, boolean>;
  look: {
    /** Patas, hilos y tela. */
    color: ColorToken;
    /** El cuerpo: el color del fondo, para que apenas se vea. */
    body: ColorToken;
    /** Opacidad general, de 0 a 1. */
    intensity: number;
    /** Opacidad con el cursor sobre texto que se está leyendo. */
    quietIntensity: number;
    /** Grosor de las patas, en píxeles CSS. */
    lineWidth: number;
    /** Grosor de los hilos y de la tela. */
    threadWidth: number;
  };
  motion: {
    /** Multiplica todas las velocidades y todos los plazos. 1 es lo previsto. */
    speed: number;
    /** Segundos, aproximados, que tarda en alcanzar al cursor. */
    lag: number;
    /** 1: llega sin pasarse. Por debajo, se pasa un poco y vuelve. */
    damping: number;
    /** Tope de velocidad, en píxeles por segundo. */
    maxSpeed: number;
  };
  idle: {
    /** Milisegundos con el cursor quieto antes de moverse por su cuenta. */
    after: number;
    /** Hasta dónde se aparta del cursor en cada sacudida, en píxeles. */
    reach: number;
    /** Espera entre sacudidas, en milisegundos. */
    pauseMin: number;
    pauseMax: number;
    /** Milisegundos quieta del todo: después se queda inmóvil y el bucle se detiene. */
    sleepAfter: number;
  };
  body: {
    /** Radio del cuerpo, en píxeles. */
    size: number;
    /** Largo de los dos tramos de cada pata. */
    femur: number;
    tibia: number;
    /** Lo que un pie se deja atrás antes de dar el paso. */
    stride: number;
    /** Lo que dura un paso. */
    stepMs: number;
    /** Separación de la malla invisible donde apoya los pies. */
    grid: number;
  };
  web: {
    /** Cantidad de partículas: anclas de la tela repartidas por la ventana. */
    particles: number;
    /** Radio alrededor de la entidad donde la tela se deja ver. */
    reveal: number;
    /** Distancia máxima entre dos anclas unidas por un hilo. */
    link: number;
  };
  proximity: {
    /** A esta distancia de algo que se puede tocar, lo nota. */
    radius: number;
    /** Y lo deja de notar a esta otra, algo mayor, para no parpadear en el borde. */
    release: number;
    /** Qué fracción de la distancia se inclina hacia ello. */
    lean: number;
    /** Tope de esa inclinación, en píxeles. */
    leanMax: number;
  };
  threads: {
    /** Hasta dónde llega un hilo hacia un nodo registrado. */
    radius: number;
    /** Hilos a la vez, como mucho. */
    max: number;
    /** Lo que tarda un hilo en tenderse. */
    attachMs: number;
    /** Cuánto cuelga, en fracción de su largo. */
    sag: number;
  };
  zones: {
    /** Lo que cuenta como interactivo. */
    interactive: string;
    /** Nodos registrados: hacia ellos tiende hilos. */
    node: string;
    /** Texto que se lee: encima, la entidad casi desaparece. */
    quiet: string;
    /** Donde no entra: al acercarse el cursor, se retira. */
    avoid: string;
    /** Cada cuánto vuelve a mirar qué hay en la página mientras se mueve. */
    rescanMs: number;
    /** Tope de elementos que vigila a la vez. */
    maxZones: number;
  };
  device: {
    /** Por debajo de este ancho no hay cursor que seguir: se toca con el dedo. */
    minWidth: number;
    /** Tope de densidad de píxeles del lienzo. */
    maxDpr: number;
  };
}

export const ENTITY_DEFAULTS: EntityConfig = {
  enabled: true,
  seed: 'entidad',
  interactions: { follow: true, idle: true, proximity: true, threads: true, web: true },
  look: {
    color: 'dim',
    body: 'bg',
    intensity: 0.55,
    quietIntensity: 0.14,
    lineWidth: 0.8,
    threadWidth: 0.6,
  },
  motion: { speed: 1, lag: 0.3, damping: 0.72, maxSpeed: 1500 },
  idle: { after: 900, reach: 13, pauseMin: 700, pauseMax: 2900, sleepAfter: 14000 },
  body: { size: 2.6, femur: 12, tibia: 16, stride: 15, stepMs: 110, grid: 14 },
  web: { particles: 170, reveal: 150, link: 96 },
  proximity: { radius: 60, release: 84, lean: 0.14, leanMax: 14 },
  threads: { radius: 240, max: 3, attachMs: 480, sag: 0.07 },
  zones: {
    interactive:
      '[role="button"],[role="link"],[role="tab"],[role="switch"],[role="checkbox"],a[href],button,input,select,textarea',
    node: '[data-aracne-node]',
    quiet: '[data-aracne-quiet]',
    avoid: '[data-aracne-avoid]',
    rescanMs: 800,
    maxZones: 240,
  },
  // 900 es el mismo corte que `useTouch`: por debajo se toca con el dedo.
  device: { minWidth: 900, maxDpr: 2 },
};

/** Una configuración a medias: lo que no se dice, se queda como está. */
export type EntityOverrides = { [K in keyof EntityConfig]?: EntityConfig[K] extends object ? Partial<EntityConfig[K]> : EntityConfig[K] };

/** Los valores por defecto con encima lo que se pida. Un nivel de profundidad basta. */
export function resolveEntityConfig(overrides: EntityOverrides = {}): EntityConfig {
  const out = { ...ENTITY_DEFAULTS } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const base = (ENTITY_DEFAULTS as unknown as Record<string, unknown>)[key];
    out[key] =
      base !== null && typeof base === 'object' && value !== null && typeof value === 'object'
        ? { ...(base as object), ...(value as object) }
        : value;
  }
  return out as unknown as EntityConfig;
}

/** Lo que el entorno le dice a la entidad antes de nacer. */
export interface EntityEnvironment {
  /** El sistema pide menos movimiento. */
  reduceMotion: boolean;
  /** Hay un puntero fino capaz de pasar por encima de las cosas: un ratón. */
  finePointer: boolean;
  /** Ancho de la ventana, en píxeles CSS. */
  width: number;
}

/**
 * Si la entidad existe o no. Sin cursor no hay a quién seguir, y con
 * reducción de movimiento se apaga entera: es movimiento y nada más que
 * movimiento, así que no hay una versión quieta que tenga sentido.
 */
export function shouldRun(config: EntityConfig, env: EntityEnvironment): boolean {
  return config.enabled && !env.reduceMotion && env.finePointer && env.width >= config.device.minWidth;
}

/** Nombre del evento que la entidad emite en `window` al entrar o salir de una zona. */
export const ENTITY_EVENT = 'aracne:entidad';

export type ZoneKind = 'node' | 'interactive';

/** Lo que viaja en cada evento de zona. */
export interface ZoneEvent {
  type: 'enter' | 'leave';
  kind: ZoneKind;
  /** El valor de `data-aracne-node`, o la etiqueta accesible si es un control. */
  id: string;
  element: Element;
}

/** Las props del componente, iguales en web y en nativo. */
export interface AracneSpiderEffectProps {
  /** Lo que se quiera cambiar de `ENTITY_DEFAULTS`. */
  config?: EntityOverrides;
  /** La preferencia de la aplicación; además se lee la del navegador. */
  reduceMotion?: boolean;
  /** Se acerca a algo que se puede tocar o a un nodo. */
  onZoneEnter?: (event: ZoneEvent) => void;
  /** Se aleja. */
  onZoneLeave?: (event: ZoneEvent) => void;
  /**
   * Si el archivo declara un vínculo entre dos nodos, por sus ids. Sin esto,
   * todos los hilos salen de la entidad; con esto, el que va al segundo nodo
   * sale del primero y lo que se dibuja es el vínculo, no el alcance. La
   * entidad no sabe qué es una entrada: pregunta. Ver `docs/ENTIDAD.md`.
   */
  linked?: (a: string, b: string) => boolean;
}
