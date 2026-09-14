/**
 * Lo que ya salió, para no repetirlo enseguida. Aquí solo la lógica; dónde se
 * guarda lo decide la interfaz.
 *
 * El historial nunca altera lo que devuelve una semilla —la misma URL tiene
 * que dar lo mismo en cualquier dispositivo—: solo influye en qué semilla se
 * elige al pulsar. Ver `pressSeed()` en `./index.ts`.
 */

export const HISTORY_SIZE = 12;

/** Añade al principio lo que acaba de salir, sin duplicados. */
export function pushHistory(
  history: readonly string[],
  ids: readonly string[],
  size = HISTORY_SIZE,
): string[] {
  const fresh = [...new Set(ids)];
  return [...fresh, ...history.filter((id) => !fresh.includes(id))].slice(0, size);
}

/** Lectura tolerante: un almacenamiento corrupto equivale a no tener historial. */
export function parseHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string").slice(0, HISTORY_SIZE);
  } catch {
    return [];
  }
}
