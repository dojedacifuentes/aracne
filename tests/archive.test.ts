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
import { shapeOf } from '../lib/archive/shape';
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
    const filters = with_({ categories: ['logica'], types: ['work'] });
    const results = filterEntries(corpus.entries, filters);
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.categories).toContain('logica');
      expect(entry.type).toBe('work');
    }
    // Combinar solo puede quitar, nunca añadir.
    expect(results.length).toBeLessThanOrEqual(
      filterEntries(corpus.entries, with_({ categories: ['logica'] })).length,
    );
  });

  it('dentro de un mismo filtro los valores suman', () => {
    const uno = filterEntries(corpus.entries, with_({ types: ['work'] })).length;
    const otro = filterEntries(corpus.entries, with_({ types: ['portal'] })).length;
    const ambos = filterEntries(corpus.entries, with_({ types: ['work', 'portal'] })).length;
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

  it('una pata retraída no se ofrece como filtro, pero sus entradas siguen en el archivo', () => {
    // El estado del contenido cambia: hoy las once patas están encendidas y
    // mañana una categoría nueva nace retraída. La regla se prueba apagando
    // una pata a mano, no esperando que el archivo tenga alguna apagada.
    const apagada = legs[0];
    const conUnaApagada = legs.map((leg) =>
      leg === apagada ? { ...leg, visible: false, missing: 1 } : leg,
    );
    const ofrecidas = facets(corpus.entries, conUnaApagada).categories.map((f) => f.id);
    expect(ofrecidas).not.toContain(apagada.category.id);
    expect(ofrecidas.length).toBe(available.categories.length - 1);

    // Sus entradas no desaparecen: se llega a ellas por tag o buscando.
    const escondidas = corpus.entries.filter((e) => e.categories.includes(apagada.category.id));
    expect(escondidas.length).toBeGreaterThan(0);
    for (const entry of escondidas) {
      expect(filterEntries(corpus.entries, NO_FILTERS)).toContain(entry);
    }
  });

  it('las patas retraídas de hoy, si las hay, tampoco se ofrecen', () => {
    for (const leg of legs.filter((l) => !l.visible)) {
      expect(available.categories.map((f) => f.id)).not.toContain(leg.category.id);
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
      query: 'laberinto',
    });
    const url = routeToUrl({ name: 'archive', filters });
    expect(url).toBe(
      '/invocaciones?categorias=logica,telaranas&tipos=work&tags=borges&estado=fiction&q=laberinto',
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
    expect(routeToUrl({ name: 'archive', filters: NO_FILTERS })).toBe('/invocaciones');
    expect(parseRoute('/invocaciones', '')).toEqual({ name: 'archive', filters: NO_FILTERS });
    expect(parseRoute('/invocaciones/', '')).toEqual({ name: 'archive', filters: NO_FILTERS });
  });

  it('la URL vieja del archivo sigue abriendo', () => {
    // `/archivo` se compartió antes de que la sección se llamara invocaciones.
    // Se sigue entendiendo, aunque ya no se escriba: quien guardó el enlace no
    // tiene por qué pagar un cambio de nombre de aquí dentro.
    expect(parseRoute('/archivo', '')).toEqual({ name: 'archive', filters: NO_FILTERS });
    expect(parseRoute('/archivo/', '')).toEqual({ name: 'archive', filters: NO_FILTERS });
    const conFiltros = parseRoute('/archivo', '?categorias=logica');
    if (conFiltros.name !== 'archive') throw new Error('la ruta debería ser el archivo');
    expect(conFiltros.filters.categories).toEqual(['logica']);
  });

  it('un filtro inventado se descarta y no vacía el archivo', () => {
    const filters = parseFilters('?tipos=nave-espacial&estado=verdadero&categorias=<script>');
    expect(filters.types).toEqual([]);
    expect(filters.statuses).toEqual([]);
    expect(filters.categories).toEqual([]);
    expect(filterEntries(corpus.entries, parseFilters('?tipos=nave-espacial'))).toHaveLength(
      corpus.entries.length,
    );
  });
});

describe('la forma del archivo', () => {
  const shape = shapeOf(corpus.entries, legs);

  it('los totales cuadran con el archivo', () => {
    expect(shape.entries).toBe(corpus.entries.length);
    expect(shape.lit + shape.retracted).toBe(legs.length);
    expect(shape.pending).toBe(
      corpus.entries.filter((e) => e.epistemicStatus === 'unverified').length,
    );
  });

  it('cada reparto suma el total, ni más ni menos', () => {
    const suma = (xs: { count: number }[]) => xs.reduce((s, x) => s + x.count, 0);
    expect(suma(shape.types)).toBe(corpus.entries.length);
    expect(suma(shape.statuses)).toBe(corpus.entries.length);
  });

  it('las proporciones son proporciones', () => {
    for (const grupo of [shape.types, shape.statuses, shape.legs, shape.tags]) {
      for (const s of grupo) {
        expect(s.share).toBeGreaterThan(0);
        expect(s.share).toBeLessThanOrEqual(1);
      }
    }
  });

  it('solo se ofrecen los tags que aparecen más de una vez', () => {
    for (const t of shape.tags) expect(t.count).toBeGreaterThan(1);
  });

  it('las medias caen dentro del rango de las puntuaciones', () => {
    for (const media of Object.values(shape.averages)) {
      expect(media).toBeGreaterThanOrEqual(1);
      expect(media).toBeLessThanOrEqual(5);
    }
  });

  it('un archivo vacío no rompe la forma', () => {
    const vacio = shapeOf([], legs);
    expect(vacio.entries).toBe(0);
    expect(vacio.types).toEqual([]);
    expect(vacio.averages.strangeness).toBe(0);
  });

  it('/adn tiene ruta propia y vuelve igual', () => {
    expect(routeToUrl({ name: 'shape' })).toBe('/adn');
    expect(parseRoute('/adn', '')).toEqual({ name: 'shape' });
    expect(parseRoute('/adn/', '')).toEqual({ name: 'shape' });
  });
});
