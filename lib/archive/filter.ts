import type { LegState } from "../content/corpus";
import type { Entry, EntryType, EpistemicStatus } from "../schema";

/**
 * El archivo completo, filtrado y buscado en local.
 *
 * Sin dependencias y sin índice: con un archivo de este tamaño, recorrerlo
 * entero en cada tecla es más barato que mantener una estructura al día. Si
 * algún día deja de serlo, se notará aquí y no en la interfaz.
 */

export interface ArchiveFilters {
  categories: string[];
  types: EntryType[];
  tags: string[];
  statuses: EpistemicStatus[];
  query: string;
}

export const NO_FILTERS: ArchiveFilters = {
  categories: [],
  types: [],
  tags: [],
  statuses: [],
  query: "",
};

export function isEmpty(filters: ArchiveFilters): boolean {
  return (
    filters.categories.length === 0 &&
    filters.types.length === 0 &&
    filters.tags.length === 0 &&
    filters.statuses.length === 0 &&
    filters.query.trim() === ""
  );
}

/**
 * Plegado de acentos sin `Intl` ni `normalize`: buscar «paradoja» tiene que
 * encontrar «paradójico», y escribir sin tildes tiene que funcionar igual.
 * Un mapa explícito se comporta igual en todos los motores.
 */
const FOLD: Record<string, string> = {
  á: "a", à: "a", ä: "a", â: "a", ã: "a",
  é: "e", è: "e", ë: "e", ê: "e",
  í: "i", ì: "i", ï: "i", î: "i",
  ó: "o", ò: "o", ö: "o", ô: "o", õ: "o",
  ú: "u", ù: "u", ü: "u", û: "u",
  ñ: "n", ç: "c",
};

const ACCENTED = new RegExp(`[${Object.keys(FOLD).join("")}]`, "g");

export function fold(value: string): string {
  return value.toLowerCase().replace(ACCENTED, (c) => FOLD[c]);
}

/** Todo lo que una entrada ofrece a la búsqueda, incluidas sus fuentes. */
function haystack(entry: Entry): string {
  return fold(
    [
      entry.id,
      entry.title,
      entry.content,
      entry.question,
      ...entry.tags,
      ...entry.sources.flatMap((s) => [s.label, s.author, s.work].filter(Boolean) as string[]),
    ].join(" "),
  );
}

/** Todas las palabras, en cualquier orden y en cualquier campo. */
export function matchesQuery(entry: Entry, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack(entry);
  return words.every((word) => text.includes(word));
}

export function filterEntries(entries: readonly Entry[], filters: ArchiveFilters): Entry[] {
  return entries.filter(
    (entry) =>
      (filters.categories.length === 0 || filters.categories.some((c) => entry.categories.includes(c))) &&
      (filters.types.length === 0 || filters.types.includes(entry.type)) &&
      (filters.tags.length === 0 || filters.tags.some((t) => entry.tags.includes(t))) &&
      (filters.statuses.length === 0 || filters.statuses.includes(entry.epistemicStatus)) &&
      matchesQuery(entry, filters.query),
  );
}

export interface Facet {
  id: string;
  count: number;
}

export interface Facets {
  categories: Facet[];
  types: Facet[];
  tags: Facet[];
  statuses: Facet[];
}

function tally(values: string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/**
 * Lo que se puede filtrar, con cuántas entradas tiene cada valor.
 *
 * Las patas retraídas no salen: la fase lo pide, y ofrecer un filtro que
 * devuelve una o dos entradas convierte el archivo en una lista de callejones.
 * Lo que no llega al umbral se sigue encontrando por su tag.
 */
export function facets(entries: readonly Entry[], legs: readonly LegState[]): Facets {
  const lit = new Set(legs.filter((leg) => leg.visible).map((leg) => leg.category.id));
  return {
    categories: tally(entries.flatMap((e) => e.categories.filter((c) => lit.has(c)))),
    types: tally(entries.map((e) => e.type)),
    tags: tally(entries.flatMap((e) => e.tags)),
    statuses: tally(entries.map((e) => e.epistemicStatus)),
  };
}

/** Añade o quita un valor. Los filtros se combinan, nunca se sustituyen. */
export function toggle<T extends string>(current: readonly T[], value: T): T[] {
  return current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
}
