import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadArchive } from '../lib/content/loader';
import { entriesOfRoom, figuresOfEntry, roomsOf, roomStates } from '../lib/museum/rooms';
import { buildDrift } from '../lib/drift/graph';
import { invoke } from '../lib/oracle/invoke';
import { freshSeed } from '../lib/oracle/rng';
import { parseRoute, routeToUrl } from '../ui/lib/route';

const { corpus } = loadArchive();
const states = roomStates(corpus.figures, corpus.rooms);

describe('el gabinete', () => {
  it('ninguna sala se queda vacía: las siete agrupan a alguien', () => {
    expect(states).toHaveLength(corpus.rooms.length);
    for (const state of states) {
      expect(state.figures.length, state.room.id).toBeGreaterThan(0);
    }
  });

  it('la pertenencia se calcula desde la figura, nunca desde la sala', () => {
    // rooms.json no declara miembros: si alguna vez lo hiciera, esto avisa.
    for (const room of corpus.rooms) {
      expect(Object.keys(room).sort()).toEqual(['criterion', 'id', 'name']);
    }
    for (const figure of corpus.figures) {
      const mine = states.filter((s) => s.figures.some((f) => f.id === figure.id)).map((s) => s.room.id);
      expect(mine.sort()).toEqual([...figure.rooms].sort());
    }
  });

  it('cada sala muestra un criterio, porque el criterio es el contenido', () => {
    for (const room of corpus.rooms) {
      expect(room.criterion.length, room.id).toBeGreaterThan(20);
    }
  });

  it('el solapamiento existe: hay figuras en más de una sala', () => {
    const overlapping = corpus.figures.filter((figure) => figure.rooms.length > 1);
    expect(overlapping.length).toBeGreaterThan(0);
    for (const figure of overlapping) {
      expect(roomsOf(figure, corpus.rooms)).toHaveLength(figure.rooms.length);
    }
  });

  it('la navegación va en los dos sentidos entre entrada y figura', () => {
    for (const figure of corpus.figures) {
      for (const id of figure.entries) {
        expect(figuresOfEntry(id, corpus.figures).map((f) => f.id)).toContain(figure.id);
      }
    }
  });

  it('las entradas de una sala son las de sus figuras, sin repetir', () => {
    for (const state of states) {
      const expected = new Set(state.figures.flatMap((figure) => figure.entries));
      expect(new Set(state.entries)).toEqual(expected);
      expect(state.entries).toHaveLength(new Set(state.entries).size);
      expect(entriesOfRoom(state, corpus.entries).map((e) => e.id)).toEqual([...state.entries].sort());
    }
  });
});

describe('invocar desde una sala', () => {
  it('el motor solo ve las entradas de la sala, nunca el resto del archivo', () => {
    for (const state of states) {
      const pool = entriesOfRoom(state, corpus.entries);
      if (pool.length === 0) continue;
      const allowed = new Set(state.entries);
      for (let i = 0; i < 40; i += 1) {
        const invocation = invoke(pool, freshSeed(31, i), []);
        expect(invocation).not.toBeNull();
        for (const entry of invocation?.entries ?? []) expect(allowed).toContain(entry.id);
      }
    }
  });

  it('la deriva tampoco se sale de la sala', () => {
    // El recorte tiene que llegar a buildDrift: si derivara sobre el archivo
    // entero, la sala se escaparía por la primera arista.
    for (const state of states) {
      const pool = entriesOfRoom(state, corpus.entries);
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

  it('una sala sin entradas ligadas no puede invocarse y no rompe nada', () => {
    const empty = states.filter((state) => state.entries.length === 0);
    for (const state of empty) {
      expect(entriesOfRoom(state, corpus.entries)).toEqual([]);
      expect(invoke([], 'k3x9q2ab', [])).toBeNull();
    }
  });
});

describe('rutas del gabinete', () => {
  it('las salas y las figuras tienen su URL, y vuelve la misma', () => {
    expect(parseRoute('/gabinete', '')).toEqual({ name: 'cabinet' });
    expect(parseRoute('/gabinete/', '')).toEqual({ name: 'cabinet' });
    for (const room of corpus.rooms) {
      const url = routeToUrl({ name: 'room', id: room.id });
      expect(parseRoute(url, '')).toEqual({ name: 'room', id: room.id });
    }
    for (const figure of corpus.figures) {
      const url = routeToUrl({ name: 'figure', id: figure.id });
      expect(parseRoute(url, '')).toEqual({ name: 'figure', id: figure.id });
    }
  });

  it('una sala que no existe cae en el gabinete, no en la portada', () => {
    expect(parseRoute('/gabinete/no-existe', '')).toEqual({ name: 'room', id: 'no-existe' });
    expect(parseRoute('/gabinete/<script>', '')).toEqual({ name: 'cabinet' });
  });

  it('la sala viaja en la invocación y sobrevive al ida y vuelta', () => {
    const route = { name: 'invocation' as const, seed: 'k3x9q2ab', legs: ['logica'], room: 'el-baul' };
    const url = routeToUrl(route);
    expect(url).toBe('/i/k3x9q2ab?patas=logica&sala=el-baul');
    const [pathname, query] = url.split('?');
    expect(parseRoute(pathname, `?${query}`)).toEqual(route);
  });

  it('sin sala, la invocación no la inventa', () => {
    const route = parseRoute('/i/k3x9q2ab', '?patas=logica');
    expect(route).toEqual({ name: 'invocation', seed: 'k3x9q2ab', legs: ['logica'] });
    expect('room' in route).toBe(false);
  });
});

describe('los emblemas', () => {
  const dir = path.join(process.cwd(), 'public', 'figures');
  const drawn = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.svg')) : [];

  it('hay al menos los seis que pedía la fase', () => {
    expect(drawn.length).toBeGreaterThanOrEqual(6);
  });

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
    // docs/MUSEO.md: seis valores, todos tokens de docs/DESIGN.md.
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
