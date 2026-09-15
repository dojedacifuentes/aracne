/**
 * La proyección del Atlas.
 *
 * **Robinson**, no Mercator. No es una manía: Mercator infla las latitudes
 * altas hasta hacer que Groenlandia parezca África, y este mapa dice cuánta
 * gente arde en cada sitio. Una proyección que miente sobre el tamaño miente
 * sobre el argumento. Robinson reparte el error en lugar de acumularlo en los
 * polos, y es la que usan los atlas impresos, que es lo que esto quiere ser.
 *
 * Pura y sin estado: dos números entran, dos números salen. Se puede probar
 * sin montar una pantalla.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Viewport {
  /** Ancho del lienzo, en píxeles. Manda: la escala sale de aquí. */
  width: number;
  /** Alto del lienzo. Solo centra; no escala, o el mapa saldría deformado. */
  height: number;
  /** 1 es el mundo entero; 8, la ampliación máxima. */
  zoom: number;
  /** Centro de la vista, en coordenadas de mundo 0..1. */
  center: Vec2;
}

/** Alto del mundo de Robinson en coordenadas de mundo: 0.5072 del ancho. */
export const WORLD_HEIGHT = 0.5072;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

/**
 * Tabla de Robinson: por cada cinco grados de latitud, cuánto se estrecha el
 * paralelo y a qué altura cae. Son los coeficientes publicados con la
 * proyección; entre puntos se interpola linealmente, como hace todo el mundo.
 */
const PLEN = [
  1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986, 0.7597,
  0.7186, 0.6732, 0.6213, 0.5722, 0.5322,
];
const PDFE = [
  0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903,
  0.8435, 0.8936, 0.9394, 0.9761, 1,
];

const interpolar = (tabla: readonly number[], i: number, t: number) =>
  tabla[i] + (tabla[Math.min(i + 1, tabla.length - 1)] - tabla[i]) * t;

/**
 * De grados a coordenadas de mundo, 0..1, con (0,0) arriba a la izquierda.
 * El alto del mapa de Robinson es 0.5072 veces su ancho; aquí se normaliza a
 * la altura para que el dibujo quepa centrado en un cuadro.
 */
export function project(lon: number, lat: number): Vec2 {
  const signo = lat < 0 ? -1 : 1;
  const grados = Math.min(Math.abs(lat), 90) / 5;
  const i = Math.min(Math.floor(grados), PLEN.length - 1);
  const t = grados - i;
  const ancho = interpolar(PLEN, i, t);
  const alto = interpolar(PDFE, i, t);
  return {
    x: 0.5 + (lon / 360) * ancho,
    y: 0.5 - signo * alto * 0.2536,
  };
}

/** De coordenadas de mundo a píxeles del cuadro, aplicando zoom y centro. */
export function toScreen(point: Vec2, view: Viewport): Vec2 {
  const escala = view.width * view.zoom;
  return {
    x: (point.x - view.center.x) * escala + view.width / 2,
    y: (point.y - view.center.y) * escala + view.height / 2,
  };
}

/** El camino de vuelta: de un píxel del cuadro a coordenadas de mundo. */
export function toWorld(point: Vec2, view: Viewport): Vec2 {
  const escala = view.width * view.zoom;
  return {
    x: (point.x - view.width / 2) / escala + view.center.x,
    y: (point.y - view.height / 2) / escala + view.center.y,
  };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Encaja la vista: el zoom entre sus topes y el centro dentro del mundo, de
 * modo que **nunca se pueda arrastrar el mapa fuera del cuadro**. Al zoom 1
 * el centro está fijo: no hay nada que mirar fuera del mundo.
 */
export function clampView(view: Viewport): Viewport {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  // Mitad de lo que se ve, en coordenadas de mundo.
  const mitadX = 0.5 / zoom;
  const mitadY = view.height / (2 * view.width * zoom);
  const alto = WORLD_HEIGHT / 2;
  return {
    width: view.width,
    height: view.height,
    zoom,
    center: {
      x: mitadX >= 0.5 ? 0.5 : clamp(view.center.x, mitadX, 1 - mitadX),
      // Si cabe el mundo entero de alto, se fija en el ecuador: arrastrar
      // hacia arriba no debe enseñar un cielo que no existe.
      y: mitadY >= alto ? 0.5 : clamp(view.center.y, 0.5 - alto + mitadY, 0.5 + alto - mitadY),
    },
  };
}

/** Amplía o reduce manteniendo quieto el punto que hay bajo el cursor. */
export function zoomAt(view: Viewport, factor: number, pointer: Vec2): Viewport {
  const antes = toWorld(pointer, view);
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const intermedio: Viewport = { ...view, zoom };
  const despues = toWorld(pointer, intermedio);
  return clampView({
    width: view.width,
    height: view.height,
    zoom,
    center: {
      x: view.center.x + (antes.x - despues.x),
      y: view.center.y + (antes.y - despues.y),
    },
  });
}

/**
 * La caja de un país en coordenadas de mundo, para poder volar hasta él.
 * Los anillos vienen en pares lon/lat planos, como se guardan.
 */
export function ringBounds(rings: readonly (readonly number[])[]): { min: Vec2; max: Vec2 } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      const p = project(ring[i], ring[i + 1]);
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
  }
  return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
}

/** La vista que enmarca un país, con aire alrededor. */
export function frame(
  rings: readonly (readonly number[])[],
  width: number,
  height: number,
): Viewport {
  const { min, max } = ringBounds(rings);
  const ancho = Math.max(max.x - min.x, 0.01);
  const alto = Math.max(max.y - min.y, 0.01);
  const porAncho = 0.7 / ancho;
  const porAlto = (0.7 * height) / (width * alto);
  return clampView({
    width,
    height,
    zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(porAncho, porAlto))),
    center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 },
  });
}
