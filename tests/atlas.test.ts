import { describe, expect, it } from 'vitest';

import { loadAtlas } from '../lib/atlas/loader';
import {
  clampView,
  frame,
  MAX_ZOOM,
  MIN_ZOOM,
  project,
  toScreen,
  toWorld,
  WORLD_HEIGHT,
  zoomAt,
  type Viewport,
} from '../lib/atlas/projection';
import { factorValue, NUCLEAR_STATES, readCountry } from '../lib/atlas/score';
import { background, bandOf, dominant, heatScale, readAll, scored } from '../lib/atlas/world';
import { parseRoute, routeToUrl, ATLAS } from '../ui/lib/route';

const { world, causes } = loadAtlas();
const countries = world.countries;
const por = (id: string) => countries.find((c) => c.id === id);

describe('la proyección del atlas', () => {
  it('coloca los puntos conocidos donde deben estar', () => {
    const centro = project(0, 0);
    expect(centro.x).toBeCloseTo(0.5, 6);
    expect(centro.y).toBeCloseTo(0.5, 6);
    // El meridiano 180 cae en el borde, y el polo, a media altura del mundo.
    expect(project(180, 0).x).toBeCloseTo(1, 6);
    expect(project(-180, 0).x).toBeCloseTo(0, 6);
    expect(project(0, 90).y).toBeCloseTo(0.5 - WORLD_HEIGHT / 2, 4);
    expect(project(0, -90).y).toBeCloseTo(0.5 + WORLD_HEIGHT / 2, 4);
  });

  it('el norte está arriba y el este a la derecha, en todas las latitudes', () => {
    for (const lat of [-60, -30, 0, 30, 60]) {
      expect(project(0, lat + 5).y).toBeLessThan(project(0, lat).y);
      expect(project(10, lat).x).toBeGreaterThan(project(0, lat).x);
    }
  });

  it('no es Mercator: los paralelos altos se estrechan en vez de estirarse', () => {
    // La diferencia con Mercator es el argumento del mapa, no un detalle.
    const anchoEcuador = project(180, 0).x - project(0, 0).x;
    const ancho60 = project(180, 60).x - project(0, 60).x;
    const ancho80 = project(180, 80).x - project(0, 80).x;
    expect(ancho60).toBeLessThan(anchoEcuador);
    expect(ancho80).toBeLessThan(ancho60);
  });

  it('ir a la pantalla y volver deja el punto donde estaba', () => {
    const view: Viewport = { width: 900, height: 558, zoom: 2.5, center: { x: 0.4, y: 0.45 } };
    for (const punto of [{ x: 0.2, y: 0.3 }, { x: 0.8, y: 0.62 }, { x: 0.5, y: 0.5 }]) {
      const vuelta = toWorld(toScreen(punto, view), view);
      expect(vuelta.x).toBeCloseTo(punto.x, 9);
      expect(vuelta.y).toBeCloseTo(punto.y, 9);
    }
  });

  it('el zoom respeta sus topes y no deja arrastrar el mundo fuera del cuadro', () => {
    const base: Viewport = { width: 800, height: 496, zoom: 1, center: { x: 0.5, y: 0.5 } };
    expect(clampView({ ...base, zoom: 99 }).zoom).toBe(MAX_ZOOM);
    expect(clampView({ ...base, zoom: 0.1 }).zoom).toBe(MIN_ZOOM);
    // Al zoom 1 el centro se queda en el centro, se pida lo que se pida.
    const tirado = clampView({ ...base, center: { x: 5, y: -3 } });
    expect(tirado.center.x).toBe(0.5);
    expect(tirado.center.y).toBe(0.5);
    // Y ampliado, nunca más allá del borde del mundo.
    const lejos = clampView({ ...base, zoom: 4, center: { x: 9, y: 9 } });
    expect(lejos.center.x).toBeLessThanOrEqual(1);
    expect(lejos.center.y).toBeLessThanOrEqual(0.5 + WORLD_HEIGHT / 2);
  });

  it('ampliar deja quieto el punto que hay bajo el cursor', () => {
    const view: Viewport = { width: 800, height: 496, zoom: 2, center: { x: 0.5, y: 0.5 } };
    const cursor = { x: 300, y: 200 };
    const antes = toWorld(cursor, view);
    const despues = toWorld(cursor, zoomAt(view, 1.5, cursor));
    expect(despues.x).toBeCloseTo(antes.x, 6);
    expect(despues.y).toBeCloseTo(antes.y, 6);
  });

  it('enmarcar un país lo mete dentro del lienzo', () => {
    const chile = por('CHL');
    expect(chile).toBeDefined();
    const view = frame(chile!.rings, 900, 558);
    const centro = toScreen(project(chile!.lon, chile!.lat), view);
    expect(centro.x).toBeGreaterThan(0);
    expect(centro.x).toBeLessThan(900);
    expect(centro.y).toBeGreaterThan(0);
    expect(centro.y).toBeLessThan(558);
  });
});

describe('el mundo del atlas', () => {
  it('trae los territorios con geometría y procedencia', () => {
    expect(countries.length).toBeGreaterThan(150);
    expect(world.source.url).toContain('natural-earth');
    for (const country of countries) {
      expect(country.rings.length, country.id).toBeGreaterThan(0);
      for (const ring of country.rings) {
        expect(ring.length % 2, country.id).toBe(0);
        expect(ring.length, country.id).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('ninguna coordenada se sale de la Tierra', () => {
    for (const country of countries) {
      for (const ring of country.rings) {
        for (let i = 0; i < ring.length; i += 2) {
          expect(Math.abs(ring[i]), country.id).toBeLessThanOrEqual(180.5);
          expect(Math.abs(ring[i + 1]), country.id).toBeLessThanOrEqual(90.5);
        }
      }
    }
  });

  it('los códigos no se repiten', () => {
    expect(new Set(countries.map((c) => c.id)).size).toBe(countries.length);
  });
});

describe('las causas y sus reglas', () => {
  it('son treinta o más, con id único', () => {
    // El Atlas se anunció con treinta finales. Puede crecer; no puede encoger.
    expect(causes.length).toBeGreaterThanOrEqual(30);
    expect(new Set(causes.map((c) => c.id)).size).toBe(causes.length);
  });

  it('cada causa dice qué pasa y qué significa ahí extinguirse', () => {
    for (const cause of causes) {
      expect(cause.premise.length, cause.id).toBeGreaterThan(40);
      expect(cause.terminal.length, cause.id).toBeGreaterThan(40);
      const palabras = cause.literary.trim().split(/\s+/).length;
      expect(palabras, cause.id).toBeGreaterThanOrEqual(60);
      expect(palabras, cause.id).toBeLessThanOrEqual(140);
    }
  });

  it('una causa uniforme no tiene factores: si los tuviera, no sería uniforme', () => {
    for (const cause of causes.filter((c) => c.uniform)) {
      expect(cause.rule.factors, cause.id).toEqual([]);
      const valores = new Set(countries.map((country) => readCountry(country, cause.rule).score));
      expect(valores.size, cause.id).toBe(1);
    }
  });

  it('toda causa que reparte, reparte de verdad', () => {
    // Si entre el percentil 5 y el 99 no hay veinticinco puntos, esa causa
    // pinta el mundo entero del mismo color y no dice nada de nadie.
    //
    // El techo es el 99 y no el 95 porque el 95 dejaba fuera aquello de lo que
    // habla la causa: la guerra nuclear separa a nueve países, que en un mundo
    // de 242 territorios son el 3,7 % y caen por encima del percentil 95.
    for (const cause of causes.filter((c) => !c.uniform)) {
      const valores = countries.map((country) => readCountry(country, cause.rule).score).sort((a, b) => a - b);
      const p5 = valores[Math.floor(valores.length * 0.05)];
      const p99 = valores[Math.floor(valores.length * 0.99)];
      expect(p99 - p5, cause.id).toBeGreaterThanOrEqual(25);
    }
  });

  it('el score siempre cae entre cero y cien', () => {
    for (const cause of causes) {
      for (const country of countries) {
        const lectura = readCountry(country, cause.rule);
        expect(lectura.score, `${cause.id}/${country.id}`).toBeGreaterThanOrEqual(0);
        expect(lectura.score, `${cause.id}/${country.id}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('el score se puede explicar: base más factores da el número', () => {
    // Un atlas que no puede enseñar su cuenta es un cartel.
    for (const country of countries.slice(0, 40)) {
      for (const cause of causes) {
        const lectura = readCountry(country, cause.rule);
        const suma = lectura.base + lectura.parts.reduce((s, p) => s + p.delta, 0);
        expect(lectura.score).toBe(Math.max(0, Math.min(100, Math.round(suma))));
      }
    }
  });

  it('es determinista: el mismo país y la misma regla dan siempre lo mismo', () => {
    const chile = por('CHL')!;
    for (const cause of causes) {
      expect(readCountry(chile, cause.rule)).toEqual(readCountry(chile, cause.rule));
    }
  });
});

describe('los factores', () => {
  it('todos se quedan entre cero y uno', () => {
    for (const country of countries) {
      for (const kind of [
        'poblacion',
        'densidad',
        'superficie',
        'renta',
        'industria',
        'tropical',
        'polar',
        'insular',
        'continental',
        'arsenal',
      ] as const) {
        const v = factorValue(kind, country);
        expect(v, `${kind}/${country.id}`).toBeGreaterThanOrEqual(0);
        expect(v, `${kind}/${country.id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('el arsenal es un hecho comprobable, no una opinión', () => {
    expect(NUCLEAR_STATES).toHaveLength(9);
    for (const id of NUCLEAR_STATES) {
      const country = por(id);
      if (!country) continue;
      expect(factorValue('arsenal', country), id).toBe(1);
    }
    expect(factorValue('arsenal', por('CHL')!)).toBe(0);
  });

  it('el trópico y el polo son excluyentes, y la latitud manda', () => {
    for (const country of countries) {
      const suma = factorValue('tropical', country) + factorValue('polar', country);
      expect(suma, country.id).toBeLessThanOrEqual(1.001);
    }
  });
});

describe('el reparto del atlas', () => {
  it('el score general es el máximo, nunca la suma', () => {
    for (const country of countries.slice(0, 60)) {
      const top = dominant(country, causes);
      const variables = readAll(country, causes).filter((r) => !r.cause.uniform);
      expect(top?.score).toBe(Math.max(...variables.map((r) => r.score)));
      expect(top?.score).toBeLessThanOrEqual(100);
    }
  });

  it('las causas uniformes quedan fuera del reparto', () => {
    // Si entraran, el mapa entero diría «100» y dejaría de ser un mapa.
    expect(background(causes).length).toBeGreaterThan(0);
    for (const country of countries) {
      expect(dominant(country, causes)?.cause.uniform, country.id).toBe(false);
    }
  });

  it('el mapa distingue: ni un solo color ni una sola causa', () => {
    const dominantes = new Set<string>();
    const scores: number[] = [];
    for (const country of countries.filter(scored)) {
      const top = dominant(country, causes);
      if (!top) continue;
      dominantes.add(top.cause.id);
      scores.push(top.score);
    }
    expect(dominantes.size).toBeGreaterThanOrEqual(6);
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThanOrEqual(30);
  });

  it('la escala reparte el mundo en cinco tramos de verdad', () => {
    // Con cortes fijos, dos tercios del mundo caían en el mismo color.
    const scores = countries.filter(scored).map((country) => dominant(country, causes)?.score ?? 0);
    const scale = heatScale(scores);
    const cuenta = [0, 0, 0, 0, 0];
    for (const score of scores) cuenta[bandOf(score, scale)] += 1;
    for (const [i, n] of cuenta.entries()) {
      expect(n, `tramo ${i}`).toBeGreaterThan(0);
      // Ninguno se queda con más de la mitad del mundo.
      expect(n, `tramo ${i}`).toBeLessThan(scores.length * 0.5);
    }
  });

  it('los tramos van en orden y sus cortes crecen', () => {
    const scale = heatScale([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(scale.cuts).toHaveLength(4);
    for (let i = 1; i < scale.cuts.length; i += 1) {
      expect(scale.cuts[i]).toBeGreaterThan(scale.cuts[i - 1]);
    }
    for (let score = 1; score <= 100; score += 1) {
      expect(bandOf(score, scale)).toBeGreaterThanOrEqual(bandOf(score - 1, scale));
    }
    expect(bandOf(0, scale)).toBe(0);
    expect(bandOf(100, scale)).toBe(4);
  });

  it('lo que no tiene población no se puntúa', () => {
    // Un atlas de exposición humana no tiene nada que decir de la Antártida.
    const sinGente = countries.filter((c) => !scored(c));
    expect(sinGente.length).toBeGreaterThan(0);
    for (const country of sinGente) expect(country.pop).toBeLessThan(10_000);
  });
});

describe('la ruta del atlas', () => {
  it('el atlas sin país es /atlas, y vuelve igual', () => {
    expect(routeToUrl(ATLAS)).toBe('/atlas');
    expect(parseRoute('/atlas', '')).toEqual(ATLAS);
    expect(parseRoute('/atlas/', '')).toEqual(ATLAS);
  });

  it('el país y la lente viajan en la URL', () => {
    const route = { name: 'atlas' as const, country: 'CHL', lens: 'guerra-nuclear' };
    expect(routeToUrl(route)).toBe('/atlas/CHL?causa=guerra-nuclear');
    expect(parseRoute('/atlas/CHL', '?causa=guerra-nuclear')).toEqual(route);
    // En minúsculas también: un código escrito a mano no debe romper la ficha.
    expect(parseRoute('/atlas/chl', '')).toEqual({ name: 'atlas', country: 'CHL', lens: null });
  });

  it('una causa que no existe no vacía el mapa', () => {
    const route = parseRoute('/atlas/CHL', '?causa=<script>');
    expect(route).toEqual({ name: 'atlas', country: 'CHL', lens: null });
  });
});
