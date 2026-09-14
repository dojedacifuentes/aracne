import { describe, expect, it } from 'vitest';

import { usableLegs } from '../lib/content/corpus';
import { loadArchive } from '../lib/content/loader';
import { pressSeed } from '../lib/oracle';
import { pushHistory } from '../lib/oracle/history';
import { invoke, type Invocation } from '../lib/oracle/invoke';
import { freshSeed } from '../lib/oracle/rng';
import { parseRoute, routeToUrl } from '../ui/lib/route';

const { corpus, legs } = loadArchive();
const lit = legs.filter((leg) => leg.visible).map((leg) => leg.category.id);
const retracted = legs.filter((leg) => !leg.visible).map((leg) => leg.category.id);

const signature = (invocation: Invocation | null) =>
  invocation
    ? `${invocation.shape}|${invocation.entries.map((entry) => entry.id).join(',')}|${invocation.dictum}`
    : 'nada';

describe('el motor de botones', () => {
  it('misma semilla y mismas patas, en cualquier orden: mismo resultado', () => {
    for (let i = 0; i < 60; i += 1) {
      const seed = freshSeed(1_789_000_000_000, i);
      const start = i % lit.length;
      const patas = lit.slice(start, start + 1 + (i % 3));
      expect(invoke(corpus.entries, seed, patas)).toEqual(invoke(corpus.entries, seed, [...patas].reverse()));
    }
  });

  it('dos pulsaciones seguidas con la misma selección dan resultados distintos', () => {
    const selections = [[], [lit[0]], [lit[1], lit[3]], lit.slice(0, 3)];
    for (const patas of selections) {
      let history: string[] = [];
      let previous = '';
      for (let press = 1; press <= 12; press += 1) {
        const { invocation } = pressSeed(corpus.entries, patas, 1_789_000_000_000 + press * 700, press, history);
        const current = signature(invocation);
        expect(current).not.toBe(previous);
        previous = current;
        history = pushHistory(history, invocation?.entries.map((entry) => entry.id) ?? []);
      }
    }
  });

  it('ninguna pata retraída llega al motor, tampoco desde una URL', () => {
    const route = parseRoute('/i/k3x9q2ab', `?patas=${[...retracted, lit[0]].join(',')}`);
    if (route.name !== 'invocation') throw new Error('la ruta debería ser una invocación');
    const patas = usableLegs(route.legs, legs);
    expect(patas).toEqual([lit[0]]);
    expect(invoke(corpus.entries, route.seed, patas)?.legs).toEqual([lit[0]]);
  });

  it('una URL compartida devuelve siempre lo mismo', () => {
    const { seed, invocation } = pressSeed(corpus.entries, [lit[2], lit[4]], 1_789_000_123_456, 9);
    const url = routeToUrl({ name: 'invocation', seed, legs: [lit[4], lit[2]] });
    const [path, query] = url.split('?');
    const route = parseRoute(path, `?${query}`);
    if (route.name !== 'invocation') throw new Error('la ruta debería ser una invocación');
    expect(signature(invoke(corpus.entries, route.seed, usableLegs(route.legs, legs)))).toBe(signature(invocation));
  });

  it('con el archivo actual, toda invocación trae la forma que anuncia', () => {
    const size = { entrada: 1, deriva: 1, arista: 2, constelacion: 3 } as const;
    for (let i = 0; i < 400; i += 1) {
      const patas = lit.filter((_, k) => (i >> k) & 1).slice(0, 4);
      const invocation = invoke(corpus.entries, freshSeed(7, i), patas);
      expect(invocation).not.toBeNull();
      if (!invocation) continue;
      expect(invocation.entries).toHaveLength(size[invocation.shape]);
      expect(invocation.dictum).not.toMatch(/[{}]/);
    }
  });
});

describe('rutas', () => {
  it('cualquier cosa que no sea una invocación es la portada', () => {
    expect(parseRoute('/', '')).toEqual({ name: 'home' });
    expect(parseRoute('/gabinete', '')).toEqual({ name: 'home' });
    expect(parseRoute('/i/AB!', '')).toEqual({ name: 'home' });
    expect(parseRoute('/i/ab', '')).toEqual({ name: 'home' });
  });

  it('las patas llegan limpias, sin repetir, y la URL no depende del orden', () => {
    const route = parseRoute('/i/k3x9q2ab/', '?patas=telaranas,logica,telaranas,<script>');
    expect(route).toEqual({ name: 'invocation', seed: 'k3x9q2ab', legs: ['telaranas', 'logica'] });
    expect(routeToUrl(route)).toBe('/i/k3x9q2ab?patas=logica,telaranas');
    expect(parseRoute('/i/k3x9q2ab', '?patas=logica%2Ctelaranas')).toEqual({
      name: 'invocation',
      seed: 'k3x9q2ab',
      legs: ['logica', 'telaranas'],
    });
  });

  it('sin patas no hay query', () => {
    expect(routeToUrl({ name: 'invocation', seed: 'k3x9q2ab', legs: [] })).toBe('/i/k3x9q2ab');
  });
});
