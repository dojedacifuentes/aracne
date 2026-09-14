import { describe, expect, it } from 'vitest';

import { loadArchive } from '../lib/content/loader';
import { withinSteps, neighbours } from '../lib/drift/graph';
import { legSigil, markSigil, sigil, type Point } from '../ui/lib/sigil';
import { parseRoute, routeToUrl, WEB } from '../ui/lib/route';

const { corpus, legs } = loadArchive();

/** Gira un punto alrededor del centro del cuadro. */
const rotate = (p: Point, angle: number): Point => {
  const dx = p.x - 0.5;
  const dy = p.y - 0.5;
  return {
    x: 0.5 + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: 0.5 + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

const points = (s: ReturnType<typeof sigil>): Point[] => [...s.star.flat(), ...s.core.flat()];

const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-9;

describe('los sellos', () => {
  it('cada uno es simétrico: girarlo un sector lo deja igual', () => {
    // Es lo único que se les pide como dibujo. Si alguien mueve un vértice a
    // ojo, el sello deja de ser simétrico y esto lo dice.
    for (let folds = 3; folds <= 7; folds += 1) {
      const marca = sigil(folds);
      const todos = points(marca);
      const girados = todos.map((p) => rotate(p, (2 * Math.PI) / folds));
      for (const p of girados) {
        expect(todos.some((q) => near(p, q)), `${folds} ejes`).toBe(true);
      }
    }
  });

  it('todo cae dentro del cuadro', () => {
    for (let folds = 3; folds <= 7; folds += 1) {
      for (const p of points(sigil(folds))) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('la misma pata lleva siempre el mismo sello, y el anillo recorre las cinco formas', () => {
    for (const leg of legs) {
      expect(legSigil(leg.category.leg)).toEqual(legSigil(leg.category.leg));
    }
    const formas = new Set(legs.map((leg) => legSigil(leg.category.leg).folds));
    expect(formas.size).toBe(5);
  });

  it('dos patas vecinas no llevan el mismo sello', () => {
    // El orden del anillo es afinidad: lo que está al lado tiene que
    // distinguirse, porque es con lo que se va a confundir.
    for (let i = 1; i < legs.length; i += 1) {
      expect(legSigil(i).folds, `patas ${i - 1} y ${i}`).not.toBe(legSigil(i - 1).folds);
    }
  });

  it('el sello de un botón se deriva de su etiqueta, sin azar suelto', () => {
    expect(markSigil('invocar')).toEqual(markSigil('invocar'));
    expect(markSigil('invocar').folds).not.toBe(undefined);
  });
});

describe('el barrio de una entrada', () => {
  it('a un paso están exactamente sus vecinos, ni uno más', () => {
    for (const entry of corpus.entries) {
      const barrio = withinSteps(entry, corpus.entries, 1);
      const vecinos = new Set(neighbours(entry, corpus.entries).map((link) => link.to));
      expect(barrio.get(entry.id)).toBe(0);
      expect(new Set([...barrio.keys()].filter((id) => id !== entry.id))).toEqual(vecinos);
    }
  });

  it('el barrio crece con los pasos y nunca se sale del archivo', () => {
    const ids = new Set(corpus.entries.map((e) => e.id));
    for (const entry of corpus.entries.slice(0, 8)) {
      const uno = withinSteps(entry, corpus.entries, 1);
      const dos = withinSteps(entry, corpus.entries, 2);
      expect(dos.size).toBeGreaterThanOrEqual(uno.size);
      for (const id of dos.keys()) expect(ids).toContain(id);
    }
  });

  it('es determinista: dos llamadas iguales devuelven lo mismo', () => {
    const entry = corpus.entries[0];
    expect(withinSteps(entry, corpus.entries, 2)).toEqual(withinSteps(entry, corpus.entries, 2));
  });
});

describe('la ruta de la tela', () => {
  it('la tela sin foco es /tela, y vuelve igual', () => {
    expect(routeToUrl(WEB)).toBe('/tela');
    expect(parseRoute('/tela', '')).toEqual(WEB);
    expect(parseRoute('/tela/', '')).toEqual(WEB);
  });

  it('el foco y la piel viajan en la URL', () => {
    for (const entry of corpus.entries.slice(0, 5)) {
      const route = { name: 'web' as const, focus: entry.id, skin: 'flujo' as const };
      const url = routeToUrl(route);
      expect(url).toBe(`/tela/${entry.id}?vista=flujo`);
      const [pathname, query] = url.split('?');
      expect(parseRoute(pathname, `?${query}`)).toEqual(route);
    }
  });

  it('un foco que no tiene forma de identificador se descarta, y la tela sigue abriéndose', () => {
    expect(parseRoute('/tela/no-existe', '')).toEqual(WEB);
    expect(parseRoute('/tela/<script>', '')).toEqual(WEB);
  });
});
