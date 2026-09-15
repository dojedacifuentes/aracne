/** Tres modos conceptuales. Ni uno más. */
export type LayoutMode = 'mobilePortrait' | 'mobileLandscape' | 'wide';

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width >= 900) return 'wide';
  if (width > height) return 'mobileLandscape';
  return 'mobilePortrait';
}

/** Ancho máximo del contenido en pantallas grandes. */
export const MAX_CONTENT_WIDTH = 1100;

/** Lado mínimo de un cuadro de dibujo. Por debajo no se lee nada. */
export const MIN_CANVAS = 240;

/**
 * El lado de un cuadro, elegido entre varios candidatos.
 *
 * Existe por un fallo concreto: los tamaños se calculaban restando a la altura
 * de la ventana, y una ventana más baja que esa resta daba **un lado
 * negativo**. Un SVG con `width="-40"` no es un SVG pequeño: es un SVG
 * inválido, y el navegador no dibuja nada. Y la ventana de 0×0 no es un caso
 * inventado: una pestaña oculta la reporta así.
 *
 * Por debajo del mínimo el cuadro se sale de la pantalla, que es un problema
 * mucho menor que no existir.
 */
export function canvasSize(...candidates: number[]): number {
  return Math.max(MIN_CANVAS, Math.min(...candidates));
}
