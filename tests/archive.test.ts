import { describe, expect, it } from 'vitest';

import {
  facets,
  filterEntries,
  fold,
  isEmpty,
  matchesQuery,
  NO_FILTERS,
  toggle,
  type ArchiveFilters,
} from '../lib/archive/filter';
import { loadArchive } from '../lib/content/loader';
import { ENTRY_TYPES, EPISTEMIC_STATUS } from '../lib/schema';
import { filtersToQuery, parseFilters, parseRoute, routeToUrl } from '../ui/lib/route';

const { corpus, legs } = loadArchive();
const available = facets(corpus.entries, legs);
const with_ = (partial: Partial<ArchiveFilters>): ArchiveFilters => ({ ...NO_FILTERS, ...partial });

describe('buscar en local', () => {
  it('los acentos no importan, en el texto ni en lo que se escribe', () => {
    expect(fold('Tlön, PARADÓJICO')).toBe('tlon, paradojico');
    const tlon = corpus.entries.find((e) => e.id === 'delyra-0003');
    expect(tlon).toBeDefined();
    for (const query of ['Tlön', 'tlon', 'TLON']) {
      expect(matchesQuery(tlon!, query), query).toBe(true);
    }
  });

  it('busca en el cuerpo, en la pregunta y en las fuentes, no solo en el título', () => {
    const babel = corpus.entries.find((e) => e.id === 'delyra-0002')!;
    expect(matchesQuery(babel, 'hexagonales')).toBe(true);
    expect(matchesQuery(babel, 'Borges')).toBe(true);
    expect(matchesQuery(babel, 'delyra-0002')).toBe(true);
    expect(matchesQuery(babel, 'palabra que no aparece')).toBe(false);
  });

  it('todas las palabras, en cualquier orden y en cualquier campo', () => {
    const babel = corpus.entries.find((e) => e.id === 'delyra-0002')!;
    expect(matchesQuery(babel, 'biblioteca hexagonales')).toBe(true);
    expect(matchesQuery(babel, 'hexagonales biblioteca')).toBe(true);
    expect(matchesQuery(babel, 'biblioteca panóptico')).toBe(false);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(filterEntries(corpus.entries, with_({ query: '   ' }))).toHaveLength(corpus.entries.length);
  });
});

describe('filtros', () => {
  it('sin filtros está el archivo entero', () => {
    expect(isEmpty(NO_FILTERS)).toBe(true);
    expect(filterEntries(corpus.entries, NO_FILTERS)).toHaveLength(corpus.entries.length);
  });

  it('se combinan entre sí y cada resultado cumple todo lo pedido', () => {
    const filters = with_({ categories: ['logica'], contributors: ['paola'] });
    const results = filterEntries(corpus.entries, filters);
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.categories).toContain('logica');
      expect(entry.contributors).toContain('paola');
    }
    // Combinar solo puede quitar, nunca añadir.
    expect(results.length).toBeLessThanOrEqual(
      filterEntries(corpus.entries, with_({ categories: ['logica'] })).length,
    );
  });

  it('dentro de un mismo filtro los valores suman', () => {
    const uno = filterEntries(corpus.entries, with_({ contributors: ['diego'] })).length;
    const otro = filterEntries(corpus.entries, with_({ contributors: ['paola'] })).length;
    const ambos = filterEntries(corpus.entries, with_({ contributors: ['diego', 'paola'] })).length;
    expect(ambos).toBe(uno + otro);
  });

  it('cada faceta cuenta lo que de verdad devuelve', () => {
    for (const facet of available.types) {
      const key = facet.id as (typeof ENTRY_TYPES)[number];
      expect(filterEntries(corpus.entries, with_({ types: [key] })), facet.id).toHaveLength(facet.count);
    }
    for (const facet of available.statuses) {
      const key = facet.id as (typeof EPISTEMIC_STATUS)[number];
      expect(filterEntries(corpus.entries, with_({ statuses: [key] })), facet.id).toHaveLength(facet.count);
    }
    for (const facet of available.tags) {
      expect(filterEntries(corpus.entries, with_({ tags: [facet.id] })), facet.id).toHaveLength(facet.count);
    }
  });

  it('las patas retraídas no se ofrecen como filtro', () => {
    const retracted = legs.filter((leg) => !leg.visible).map((leg) => leg.category.id);
    expect(retracted.length).toBeGreaterThan(0);
    for (const id of retracted) {
      expect(available.categories.map((f) => f.id)).not.toContain(id);
    }
    // Pero sus entradas siguen en el archivo: se llega a ellas por tag o buscando.
    for (const id of retracted) {
      const hidden = corpus.entries.filter((e) => e.categories.includes(id));
      for (const entry of hidden) {
        expect(filterEntries(corpus.entries, NO_FILTERS)).toContain(entry);
      }
    }
  });

  it('quitar es lo contrario de poner', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggle(toggle(['a'], 'b'), 'b')).toEqual(['a']);
  });
});

describe('los filtros viajan en la URL', () => {
  it('ida y vuelta, con el mismo orden siempre', () => {
    const filters = with_({
      categories: ['telaranas', 'logica'],
      types: ['work'],
      tags: ['borges'],
      statuses: ['fiction'],
      contributors: ['paola'],
      query: 'laberinto',
    });
    const url = routeToUrl({ name: 'archive', filters });
    expect(url).toBe(
      '/archivo?categorias=logica,telaranas&tipos=work&tags=borges&estado=fiction&quien=paola&q=laberinto',
    );
    const [pathname, query] = url.split('?');
    const route = parseRoute(pathname, `?${query}`);
    if (route.name !== 'archive') throw new Error('la ruta debería ser el archivo');
    expect(filterEntries(corpus.entries, route.filters)).toEqual(filterEntries(corpus.entries, filters));
  });

  it('el orden en el que se eligen no cambia la URL', () => {
    const a = filtersToQuery(with_({ categories: ['logica', 'telaranas'] }));
    const b = filtersToQuery(with_({ categories: ['telaranas', 'logica'] }));
    expect(a).toBe(b);
  });

  it('sin filtros no hay query', () => {
    expect(routeToUrl({ name: 'archive', filters: NO_FILTERS })).toBe('/archivo');
    expect(parseRoute('/archivo', '')).toEqual({ name: 'archive', filters: NO_FILTERS });
    expect(parseRoute('/archivo/', '')).toEqual({ name: 'archive', filters: NO_FILTERS });
  });

  it('un filtro inventado se descarta y no vacía el archivo', () => {
    const filters = parseFilters('?tipos=nave-espacial&estado=verdadero&categorias=<script>&quien=nadie');
    expect(filters.types).toEqual([]);
    expect(filters.statuses).toEqual([]);
    expect(filters.categories).toEqual([]);
    // `quien=nadie` tiene forma válida: no devuelve nada, y eso es correcto.
    expect(filters.contributors).toEqual(['nadie']);
    expect(filterEntries(corpus.entries, parseFilters('?tipos=nave-espacial'))).toHaveLength(
      corpus.entries.length,
    );
  });
});
