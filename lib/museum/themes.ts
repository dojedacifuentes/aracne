import type { Figure, Theme } from "../content/corpus";
import type { Entry } from "../schema";

/**
 * Las biografías, agrupadas.
 *
 * `themes.json` no lista figuras y no debe listarlas: la pertenencia la
 * declara cada figura en su campo `theme`, igual que una entrada declara sus
 * categorías. Un tema es el resultado de una consulta, no un dato duplicado
 * que se pueda desincronizar.
 *
 * Los temas no clasifican vidas sino ideas: lo que agrupa a cinco personas no
 * es su siglo ni su escuela, sino el problema en el que se metieron. Una
 * figura está en uno solo, porque la sección se lee en orden y una lista con
 * repeticiones no se lee: se consulta.
 *
 * Aquí no se importa React ni nada de la interfaz: el tema se puede probar sin
 * montar una pantalla.
 */

export interface ThemeState {
  theme: Theme;
  /** En el orden de `figures.json`, que es el orden en que se escribieron. */
  figures: Figure[];
  /** Entradas ligadas a las figuras del tema, sin repetir. */
  entries: string[];
}

export function themeStates(figures: readonly Figure[], themes: readonly Theme[]): ThemeState[] {
  return themes.map((theme) => {
    const members = figures.filter((figure) => figure.theme === theme.id);
    return {
      theme,
      figures: members,
      entries: [...new Set(members.flatMap((figure) => figure.entries))].sort(),
    };
  });
}

/** El tema de una figura, o null si apunta a uno que no existe. */
export function themeOf(figure: Figure, themes: readonly Theme[]): Theme | null {
  return themes.find((theme) => theme.id === figure.theme) ?? null;
}

/**
 * El camino de vuelta: de una entrada a las figuras que la reclaman. La
 * navegación va en los dos sentidos, y el único lado donde el vínculo está
 * escrito es el de la figura.
 */
export function figuresOfEntry(entryId: string, figures: readonly Figure[]): Figure[] {
  return figures.filter((figure) => figure.entries.includes(entryId));
}

/**
 * Las entradas de un tema, como objetos y en el orden del archivo.
 * Es lo que `invocar desde este tema` le pasa al motor: un corpus recortado,
 * no una categoría nueva. El motor no se entera de que hay biografías.
 */
export function entriesOfTheme(state: ThemeState, entries: readonly Entry[]): Entry[] {
  const wanted = new Set(state.entries);
  return entries.filter((entry) => wanted.has(entry.id));
}
