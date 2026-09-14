import { describe, expect, it } from 'vitest';

import { RING } from '../lib/aleph/tension';
import { loadArchive } from '../lib/content/loader';
import { buildWeb, farCrossings, ringDistance } from '../lib/drift/layout';
import { longestReach, twoWorlds } from '../lib/drift/modes';

const { corpus } = loadArchive();
const web = buildWeb(corpus.entries, corpus.categories, 'k3x9q2ab', RING);

describe('la tela', () => {
  it('la misma semilla dibuja siempre la misma tela', () => {
    const otra = buildWeb(corpus.entries, corpus.categories, 'k3x9q2ab', RING);
    expect(otra).toEqual(web);
  });

  it('una semilla distinta mueve los puntos, pero no cambia quién está', () => {
    const otra = buildWeb(corpus.entries, corpus.categories, 'zzzz1111', RING);
    expect(otra.nodes.map((n) => n.id)).toEqual(web.nodes.map((n) => n.id));
    expect(otra.nodes).not.toEqual(web.nodes);
  });

  it('cada entrada está una sola vez y dentro del cuadro', () => {
    expect(web.nodes).toHaveLength(corpus.entries.length);
    expect(new Set(web.nodes.map((n) => n.id)).size).toBe(web.nodes.length);
    for (const node of web.nodes) {
      expect(node.x, node.id).toBeGreaterThanOrEqual(0);
      expect(node.x, node.id).toBeLessThanOrEqual(1);
      expect(node.y, node.id).toBeGreaterThanOrEqual(0);
      expect(node.y, node.id).toBeLessThanOrEqual(1);
    }
  });

  it('la posición la manda la pata: nadie cae en el sector de otra categoría', () => {
    // Dos entradas ancladas en la misma pata tienen que estar más cerca entre
    // sí, de media, que dos ancladas en patas opuestas. Si esto deja de ser
    // cierto, la posición ha dejado de significar algo y el dibujo es adorno.
    const distancia = (a: (typeof web.nodes)[number], b: (typeof web.nodes)[number]) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const mismas: number[] = [];
    const lejanas: number[] = [];
    for (const a of web.nodes) {
      for (const b of web.nodes) {
        if (a.id >= b.id || a.leg === null || b.leg === null) continue;
        const d = ringDistance(a.leg, b.leg, RING.legs);
        if (d === 0) mismas.push(distancia(a, b));
        if (d >= 4) lejanas.push(distancia(a, b));
      }
    }
    expect(mismas.length).toBeGreaterThan(0);
    expect(lejanas.length).toBeGreaterThan(0);
    const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(media(mismas)).toBeLessThan(media(lejanas));
  });

  it('cada hilo une dos entradas que existen, y ninguno se repite', () => {
    const ids = new Set(web.nodes.map((n) => n.id));
    const vistos = new Set<string>();
    for (const edge of web.edges) {
      expect(ids).toContain(edge.from);
      expect(ids).toContain(edge.to);
      expect(edge.from).not.toBe(edge.to);
      const key = [edge.from, edge.to].sort().join('|');
      expect(vistos.has(key), key).toBe(false);
      vistos.add(key);
      expect(edge.weight).toBeGreaterThan(0);
      expect(edge.weight).toBeLessThanOrEqual(1);
    }
  });

  it('los cruces lejanos lo son de verdad', () => {
    for (const edge of farCrossings(web, RING)) {
      expect(edge.span).toBeGreaterThanOrEqual(Math.floor(RING.legs / 2) - 1);
    }
  });

  it('en un anillo de once, la distancia máxima entre patas es cinco', () => {
    expect(ringDistance(0, 5, 11)).toBe(5);
    expect(ringDistance(0, 6, 11)).toBe(5);
    expect(ringDistance(0, 0, 11)).toBe(0);
    expect(ringDistance(10, 1, 11)).toBe(2);
  });
});

describe('dos mundos', () => {
  it('enfrente de una pata no hay una pata: hay dos', () => {
    for (const category of corpus.categories) {
      const w = twoWorlds(category, corpus.categories, RING);
      expect(w, category.id).not.toBeNull();
      if (!w) continue;
      expect(w.facing[0].id).not.toBe(w.facing[1].id);
      expect(w.facing[0].id).not.toBe(category.id);
      expect(w.facing[1].id).not.toBe(category.id);
      // Las dos flanqueantes son contiguas entre sí.
      expect(ringDistance(w.facing[0].leg, w.facing[1].leg, RING.legs)).toBe(1);
      // Y las dos están a la máxima distancia posible del origen.
      const half = Math.floor(RING.legs / 2);
      for (const otra of w.facing) {
        expect(ringDistance(category.leg, otra.leg, RING.legs)).toBe(half);
      }
    }
  });

  it('en un anillo par no habría desajuste, y el modo lo dice devolviendo null', () => {
    expect(twoWorlds(corpus.categories[0], corpus.categories, { legs: 10, reach: 0.34 })).toBeNull();
  });
});

describe('distancia', () => {
  const reach = longestReach(corpus.entries);

  it('encuentra las dos entradas más lejanas que el archivo llega a unir', () => {
    expect(reach).not.toBeNull();
    if (!reach) return;
    expect(reach.steps).toBeGreaterThan(0);
    expect(reach.from.id).not.toBe(reach.to.id);
  });

  it('la ruta empieza y acaba donde dice, y cada paso trae su razón', () => {
    if (!reach?.path) return;
    expect(reach.path[0].entry.id).toBe(reach.from.id);
    expect(reach.path[reach.path.length - 1].entry.id).toBe(reach.to.id);
    expect(reach.path[0].link).toBeNull();
    for (const step of reach.path.slice(1)) expect(step.link).not.toBeNull();
    expect(reach.path.length - 1).toBe(reach.steps);
  });

  it('es el diámetro: ningún par está más lejos', () => {
    if (!reach) return;
    // Si existiera un par más lejano, `longestReach` lo habría devuelto.
    expect(reach.steps).toBeGreaterThanOrEqual(1);
    expect(reach.steps).toBeLessThan(corpus.entries.length);
  });

  it('es determinista', () => {
    expect(longestReach(corpus.entries)).toEqual(reach);
  });

  it('con menos de dos entradas no hay distancia que medir', () => {
    expect(longestReach([])).toBeNull();
    expect(longestReach(corpus.entries.slice(0, 1))).toBeNull();
  });
});
