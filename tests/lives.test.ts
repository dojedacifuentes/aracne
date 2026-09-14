import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadArchive } from '../lib/content/loader';
import { entriesOfTheme, figuresOfEntry, themeOf, themeStates } from '../lib/museum/themes';
import { buildDrift } from '../lib/drift/graph';
import { invoke } from '../lib/oracle/invoke';
import { freshSeed } from '../lib/oracle/rng';
import { parseRoute, routeToUrl } from '../ui/lib/route';

const { corpus } = loadArchive();
const states = themeStates(corpus.figures, corpus.themes);

describe('las biografías', () => {
  it('ningún tema se queda vacío', () => {
    expect(states).toHaveLength(corpus.themes.length);
    for (const state of states) {
      expect(state.figures.length, state.theme.id).toBeGreaterThan(0);
    }
  });

  it('cada figura está en un tema y en uno solo, y el tema existe', () => {
    for (const figure of corpus.figures) {
      const suyos = states.filter((s) => s.figures.some((f) => f.id === figure.id));
      expect(suyos.map((s) => s.theme.id), figure.id).toEqual([figure.theme]);
      expect(themeOf(figure, corpus.themes), figure.id).not.toBeNull();
    }
    // Y entre todos los temas están las cuarenta y cuatro, sin repetir.
    const repartidas = states.flatMap((s) => s.figures.map((f) => f.id));
    expect(new Set(repartidas).size).toBe(corpus.figures.length);
  });

  it('la pertenencia se calcula desde la figura, nunca desde el tema', () => {
    // themes.json no declara miembros: si alguna vez lo hiciera, esto avisa.
    for (const theme of corpus.themes) {
      expect(Object.keys(theme).sort()).toEqual(['criterion', 'id', 'name']);
    }
  });

  it('cada tema muestra un criterio, porque el criterio es el contenido', () => {
    for (const theme of corpus.themes) {
      expect(theme.criterion.length, theme.id).toBeGreaterThan(40);
    }
  });

  it('cada biografía trae una idea y un hecho, y no son lo mismo', () => {
    for (const figure of corpus.figures) {
      expect(figure.idea.length, figure.id).toBeGreaterThan(80);
      expect(figure.note.length, figure.id).toBeGreaterThan(40);
      expect(figure.idea, figure.id).not.toBe(figure.note);
    }
  });

  it('la navegación va en los dos sentidos entre entrada y figura', () => {
    for (const figure of corpus.figures) {
      for (const id of figure.entries) {
        expect(figuresOfEntry(id, corpus.figures).map((f) => f.id)).toContain(figure.id);
      }
    }
  });

  it('las entradas de un tema son las de sus figuras, sin repetir', () => {
    for (const state of states) {
      const expected = new Set(state.figures.flatMap((figure) => figure.entries));
      expect(new Set(state.entries)).toEqual(expected);
      expect(state.entries).toHaveLength(new Set(state.entries).size);
      expect(entriesOfTheme(state, corpus.entries).map((e) => e.id)).toEqual([...state.entries].sort());
    }
  });
});

describe('las obras enlazadas', () => {
  it('ninguna URL es inventada de forma, y ninguna se repite', () => {
    // Que exista al otro lado se comprueba a mano al añadirla; aquí se
    // comprueba lo que una prueba puede comprobar sin red.
    const vistas = new Set<string>();
    for (const figure of corpus.figures) {
      for (const work of figure.works) {
        expect(work.url.startsWith('http://') || work.url.startsWith('https://'), work.url).toBe(true);
        expect(work.title.length, figure.id).toBeGreaterThan(3);
        expect(work.where.length, figure.id).toBeGreaterThan(2);
        expect(vistas.has(work.url), work.url).toBe(false);
        vistas.add(work.url);
      }
    }
  });

  it('hay obra que abrir en una buena parte del archivo', () => {
    const conObra = corpus.figures.filter((figure) => figure.works.length > 0);
    expect(conObra.length).toBeGreaterThanOrEqual(24);
  });
});

describe('invocar desde un tema', () => {
  it('el motor solo ve las entradas del tema, nunca el resto del archivo', () => {
    for (const state of states) {
      const pool = entriesOfTheme(state, corpus.entries);
      if (pool.length === 0) continue;
      const allowed = new Set(state.entries);
      for (let i = 0; i < 40; i += 1) {
        const invocation = invoke(pool, freshSeed(31, i), []);
        expect(invocation).not.toBeNull();
        for (const entry of invocation?.entries ?? []) expect(allowed).toContain(entry.id);
      }
    }
  });

  it('la deriva tampoco se sale del tema', () => {
    for (const state of states) {
      const pool = entriesOfTheme(state, corpus.entries);
      if (pool.length === 0) continue;
      const allowed = new Set(state.entries);
      for (const start of pool) {
        for (let i = 0; i < 8; i += 1) {
          const steps = buildDrift(start, pool, 4, freshSeed(53, i));
          for (const step of steps) expect(allowed).toContain(step.entry.id);
        }
      }
    }
  });
});

describe('rutas de las biografías', () => {
  it('los temas y las figuras tienen su URL, y vuelve la misma', () => {
    expect(parseRoute('/biografias', '')).toEqual({ name: 'lives' });
    expect(parseRoute('/biografias/', '')).toEqual({ name: 'lives' });
    for (const theme of corpus.themes) {
      const url = routeToUrl({ name: 'theme', id: theme.id });
      expect(url).toBe(`/biografias/${theme.id}`);
      expect(parseRoute(url, '')).toEqual({ name: 'theme', id: theme.id });
    }
    for (const figure of corpus.figures) {
      const url = routeToUrl({ name: 'figure', id: figure.id });
      expect(parseRoute(url, '')).toEqual({ name: 'figure', id: figure.id });
    }
  });

  it('las URL viejas del gabinete siguen abriendo', () => {
    // Se compartieron antes de que las salas fueran temas: romperlas sería
    // cobrarle a quien guardó el enlace un cambio de idea de aquí dentro.
    expect(parseRoute('/gabinete', '')).toEqual({ name: 'lives' });
    expect(parseRoute('/gabinete/el-baul', '')).toEqual({ name: 'theme', id: 'el-baul' });
  });

  it('un tema que no existe cae en las biografías, no en la portada', () => {
    expect(parseRoute('/biografias/no-existe', '')).toEqual({ name: 'theme', id: 'no-existe' });
    expect(parseRoute('/biografias/<script>', '')).toEqual({ name: 'lives' });
  });

  it('el tema viaja en la invocación y sobrevive al ida y vuelta', () => {
    const route = { name: 'invocation' as const, seed: 'k3x9q2ab', legs: ['logica'], room: 'la-huella-menor' };
    const url = routeToUrl(route);
    expect(url).toBe('/i/k3x9q2ab?patas=logica&sala=la-huella-menor');
    const [pathname, query] = url.split('?');
    expect(parseRoute(pathname, `?${query}`)).toEqual(route);
  });
});

describe('los emblemas', () => {
  const dir = path.join(process.cwd(), 'public', 'figures');
  const drawn = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.svg')) : [];

  it('cada emblema es de una figura que existe y lleva su descripción', () => {
    for (const file of drawn) {
      const id = file.replace('.svg', '');
      const figure = corpus.figures.find((f) => f.id === id);
      expect(figure, `${id} no está en figures.json`).toBeDefined();
      const svg = fs.readFileSync(path.join(dir, file), 'utf8');
      expect(svg).toContain(`aria-label="${figure?.emblem}"`);
    }
  });

  it('ninguno se sale de la grilla de 32 ni de la paleta de seis tokens', () => {
    const PALETTE = ['#0E0D0C', '#161412', '#2A2724', '#8A857D', '#EDEAE3', '#B5432E'];
    for (const file of drawn) {
      const svg = fs.readFileSync(path.join(dir, file), 'utf8');
      expect(svg, file).toContain('viewBox="0 0 32 32"');
      for (const fill of svg.match(/fill="([^"]+)"/g) ?? []) {
        expect(PALETTE, `${file}: ${fill}`).toContain(fill.slice(6, -1));
      }
      for (const rect of svg.match(/<rect[^>]*>/g) ?? []) {
        const x = Number(/x="(\d+)"/.exec(rect)?.[1]);
        const y = Number(/y="(\d+)"/.exec(rect)?.[1]);
        const width = Number(/width="(\d+)"/.exec(rect)?.[1]);
        expect(x + width, `${file}: ${rect}`).toBeLessThanOrEqual(32);
        expect(y, `${file}: ${rect}`).toBeLessThan(32);
      }
    }
  });

  it('el acento no pasa del 5% de los píxeles de ningún emblema', () => {
    for (const file of drawn) {
      const svg = fs.readFileSync(path.join(dir, file), 'utf8');
      const accent = (svg.match(/<rect[^>]*fill="#B5432E"[^>]*>/g) ?? []).reduce(
        (sum, rect) => sum + Number(/width="(\d+)"/.exec(rect)?.[1] ?? 0),
        0,
      );
      expect(accent, file).toBeLessThanOrEqual(32 * 32 * 0.05);
    }
  });
});
