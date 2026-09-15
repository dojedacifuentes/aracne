import type { Figure } from "../content/corpus";

/**
 * La cronología de los autores.
 *
 * El gabinete se leía por temas, que agrupan problemas y no vidas. Eso sigue
 * existiendo —y sigue siendo el criterio— pero para **entrar** al conjunto
 * hace falta un orden que no exija saber nada de antemano, y el tiempo lo es:
 * cualquiera sabe si 1632 va antes que 1889.
 *
 * El año no se escribe aparte: se lee de `years`, que es el dato que ya está.
 * Nada calculable se escribe a mano (CLAUDE.md).
 */

/**
 * Primer año de una vida, o null si la cadena no trae ninguno reconocible.
 *
 * Lee también las fechas anteriores a nuestra era, que es justo donde falla
 * un lector ingenuo: Ovidio pone «43 a.C.–17 d.C.» y con un `\d{3,4}` se iba
 * al final de la cronología, detrás de quien vive hoy. Antes de Cristo, el año
 * vuelve negativo, que es lo que lo ordena bien.
 */
export function birthYear(figure: Figure): number | null {
  const match = /(\d{1,4})\s*(a\.?\s?c\.?)?/i.exec(figure.years);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;
  return match[2] ? -year : year;
}

/** El siglo en el que nace: 1889 → 19, 1632 → 17, −43 → −1 (primero a.C.). */
export function century(figure: Figure): number | null {
  const year = birthYear(figure);
  if (year === null) return null;
  if (year < 0) return -(Math.floor((-year - 1) / 100) + 1);
  return Math.floor((year - 1) / 100) + 1;
}

/** Cómo se dice un siglo en la interfaz. Sin números romanos: son un acertijo. */
export function centuryLabel(value: number): string {
  return value < 0 ? `siglo ${-value} a.C.` : `siglo ${value}`;
}

/**
 * Todos los autores en una sola cronología ascendente. Quien no tenga año
 * reconocible va al final, en su orden alfabético: no se inventa una fecha
 * para que encaje en la fila.
 */
export function byChronology(figures: readonly Figure[]): Figure[] {
  return [...figures].sort((a, b) => {
    const ya = birthYear(a);
    const yb = birthYear(b);
    if (ya === null && yb === null) return a.name.localeCompare(b.name, "es");
    if (ya === null) return 1;
    if (yb === null) return -1;
    return ya - yb || a.name.localeCompare(b.name, "es");
  });
}

/** Los siglos que hay, en orden, para poder filtrar por uno sin escribir la lista. */
export function centuries(figures: readonly Figure[]): number[] {
  const set = new Set<number>();
  for (const figure of figures) {
    const value = century(figure);
    if (value !== null) set.add(value);
  }
  return [...set].sort((a, b) => a - b);
}
