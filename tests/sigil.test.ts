import { describe, expect, it } from 'vitest';

import { loadArchive } from '../lib/content/loader';
import { withinSteps, neighbours } from '../lib/drift/graph';
import { pointOnRoute, routeLength, TRACE_GRID, traceRoute } from '../lib/drift/layout';
import { canvasSize, MIN_CANVAS } from '../ui/lib/layout';
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

describe('las trazas del flujo', () => {
  const a = { x: 0.2, y: 0.3 };
  const b = { x: 0.8, y: 0.7 };

  it('empieza y acaba en los puntos que se le dan', () => {
    // Los codos van a la rejilla; los extremos no. La posición de una entrada
    // la manda su categoría, y una traza no puede moverla de sitio.
    for (const clave of ['a|b', 'delyra-0001|delyra-0020', 'x']) {
      const ruta = traceRoute(a, b, clave);
      expect(ruta[0]).toEqual(a);
      expect(ruta[ruta.length - 1]).toEqual(b);
    }
  });

  it('todos sus tramos son rectos: nunca hay una diagonal', () => {
    for (let i = 0; i < 60; i += 1) {
      const from = { x: (i % 7) / 10, y: (i % 5) / 10 };
      const to = { x: 1 - (i % 4) / 10, y: 1 - (i % 6) / 10 };
      const ruta = traceRoute(from, to, `traza${i}`);
      for (let j = 1; j < ruta.length; j += 1) {
        const mismoX = Math.abs(ruta[j].x - ruta[j - 1].x) < 1e-12;
        const mismoY = Math.abs(ruta[j].y - ruta[j - 1].y) < 1e-12;
        expect(mismoX || mismoY, `tramo ${j} de traza${i}`).toBe(true);
      }
    }
  });

  it('los codos caen en la rejilla, que es lo que hace que parezca un circuito', () => {
    for (let i = 0; i < 40; i += 1) {
      const ruta = traceRoute(a, b, `codo${i}`);
      for (const codo of ruta.slice(1, -1)) {
        const enRejilla =
          Math.abs(codo.x / TRACE_GRID - Math.round(codo.x / TRACE_GRID)) < 1e-9 ||
          Math.abs(codo.y / TRACE_GRID - Math.round(codo.y / TRACE_GRID)) < 1e-9;
        expect(enRejilla, `codo de ${i}`).toBe(true);
      }
    }
  });

  it('la misma pareja se encamina siempre igual', () => {
    // Si el recorrido cambiara entre visitas, el dibujo dejaría de ser un mapa.
    expect(traceRoute(a, b, 'delyra-0001|delyra-0020')).toEqual(traceRoute(a, b, 'delyra-0001|delyra-0020'));
    expect(traceRoute(a, b, 'otra')).not.toEqual(traceRoute(a, b, 'distinta'));
  });

  it('lo que viaja por la traza no se sale de ella', () => {
    for (let i = 0; i < 12; i += 1) {
      const ruta = traceRoute(a, b, `pulso${i}`);
      const largo = routeLength(ruta);
      expect(largo).toBeGreaterThan(0);
      expect(pointOnRoute(ruta, 0)).toEqual(a);
      expect(pointOnRoute(ruta, 1)).toEqual(b);
      // Fuera de 0..1 se devuelve el extremo: nada se escapa de la pista.
      expect(pointOnRoute(ruta, -3)).toEqual(a);
      expect(pointOnRoute(ruta, 9)).toEqual(b);
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const punto = pointOnRoute(ruta, t);
        const sobre = ruta.some((v, j) => {
          if (j === 0) return false;
          const u = ruta[j - 1];
          const enX = Math.abs(u.x - v.x) < 1e-12 && Math.abs(punto.x - v.x) < 1e-9;
          const enY = Math.abs(u.y - v.y) < 1e-12 && Math.abs(punto.y - v.y) < 1e-9;
          return enX || enY;
        });
        expect(sobre, `t=${t.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('avanza: dos instantes distintos no dan el mismo punto', () => {
    const ruta = traceRoute(a, b, 'avance');
    expect(pointOnRoute(ruta, 0.25)).not.toEqual(pointOnRoute(ruta, 0.75));
  });
});

describe('el lado de un cuadro de dibujo', () => {
  it('nunca es negativo, por baja que sea la ventana', () => {
    // El fallo que lo trajo: la altura de la ventana menos 240. Una pestaña
    // oculta reporta 0×0, así que la resta daba -240 y el SVG salía con
    // width="-40", que no es un SVG pequeño sino un SVG inválido.
    for (const alto of [0, 1, 100, 239, 240, 300, 900]) {
      const lado = canvasSize(Math.round(1280 * 0.38), alto - 120);
      expect(lado, `alto ${alto}`).toBeGreaterThanOrEqual(MIN_CANVAS);
    }
    expect(canvasSize(-500, -20, 720)).toBe(MIN_CANVAS);
  });

  it('con sitio de sobra, manda el candidato más pequeño', () => {
    expect(canvasSize(600, 500, 720)).toBe(500);
    expect(canvasSize(1000, 900, 720)).toBe(720);
  });
});
