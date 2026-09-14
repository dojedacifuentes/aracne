import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { RAW_ENTRIES } from '../content/index.generated';
import { usableLegs } from '../lib/content/corpus';
import { loadArchive } from '../lib/content/loader';
import { CATEGORY_VISIBILITY_THRESHOLD } from '../lib/schema';

describe('el archivo', () => {
  const { corpus, legs } = loadArchive();

  it('no descarta ninguna entrada al cargar', () => {
    expect(corpus.entries).toHaveLength(RAW_ENTRIES.length);
  });

  it('una entrada por archivo, nunca un entries.json único', () => {
    expect(fs.existsSync(path.join('content', 'entries.json'))).toBe(false);
    const files = fs.readdirSync(path.join('content', 'entries')).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(corpus.entries.length);
  });

  it('el anillo va de 0 a n-1, en el orden de categories.json', () => {
    expect(legs.map((leg) => leg.category.leg)).toEqual(legs.map((_, i) => i));
  });

  it('una pata se enciende al llegar al umbral, y solo entonces', () => {
    for (const leg of legs) {
      expect(leg.visible).toBe(leg.count >= CATEGORY_VISIBILITY_THRESHOLD);
      expect(leg.missing).toBe(Math.max(0, CATEGORY_VISIBILITY_THRESHOLD - leg.count));
    }
  });

  it('las patas retraídas nunca llegan al motor', () => {
    const all = legs.map((leg) => leg.category.id);
    const usable = usableLegs(all, legs);
    for (const leg of legs) expect(usable.includes(leg.category.id)).toBe(leg.visible);
    expect(usableLegs(['no-existe', ...all, ...all], legs)).toEqual(usable);
  });

  it('toda relación explícita es bidireccional', () => {
    const byId = new Map(corpus.entries.map((e) => [e.id, e]));
    for (const entry of corpus.entries) {
      for (const id of entry.related) expect(byId.get(id)?.related).toContain(entry.id);
    }
  });

  it('las figuras apuntan a entradas y salas que existen', () => {
    const ids = new Set(corpus.entries.map((e) => e.id));
    const rooms = new Set(corpus.rooms.map((r) => r.id));
    for (const figure of corpus.figures) {
      for (const id of figure.entries) expect(ids.has(id)).toBe(true);
      for (const room of figure.rooms) expect(rooms.has(room)).toBe(true);
    }
  });
});
