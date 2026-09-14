import { describe, expect, it } from 'vitest';

import { loadArchive } from '../lib/content/loader';
import { buildDrift } from '../lib/drift/graph';
import { invoke } from '../lib/oracle/invoke';
import { freshSeed } from '../lib/oracle/rng';
import { ENTRY_TYPES } from '../lib/schema';
import { bridgeText, dictumText, faultText, linkText } from '../ui/lib/copy';

describe('lo que une y lo que separa, en español', () => {
  const { corpus } = loadArchive();
  const name = (id: string) => corpus.categories.find((c) => c.id === id)?.name;
  // «portal» se escribe igual en los dos idiomas.
  const english = new RegExp(`\\b(${ENTRY_TYPES.filter((t) => t !== 'portal').join('|')})\\b`);

  it('nunca asoma un id inglés de tipo, un id de categoría ni una llave de plantilla', () => {
    const categoryIds = new RegExp(`(^|[^a-z-])(${corpus.categories.map((c) => c.id).join('|')})($|[^a-z-])`);
    for (let i = 0; i < 400; i += 1) {
      const invocation = invoke(corpus.entries, freshSeed(99, i), []);
      if (!invocation) continue;
      for (const text of [bridgeText(invocation, name), faultText(invocation), dictumText(invocation, name)]) {
        expect(text).not.toMatch(english);
        expect(text).not.toMatch(categoryIds);
        expect(text).not.toMatch(/[{}]/);
      }
    }
  });

  it('el dictamen solo cambia la etiqueta, nunca los títulos', () => {
    const [a, b] = corpus.entries;
    const invocation = {
      seed: 'x',
      legs: [],
      shape: 'arista' as const,
      entries: [a, b],
      bridge: { kind: 'tipo' as const, label: 'work' },
      fault: null,
      dictum: 'Comparten work. Framework no se toca.',
    };
    expect(dictumText(invocation, name)).toBe('Comparten obra. Framework no se toca.');
  });

  it('cada paso de una deriva se explica', () => {
    for (const entry of corpus.entries) {
      for (const step of buildDrift(entry, corpus.entries, 4, `prueba-${entry.id}`)) {
        if (!step.link) continue;
        const text = linkText(step.link, name);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(english);
      }
    }
  });
});
