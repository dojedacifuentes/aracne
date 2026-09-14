/** Tres modos conceptuales. Ni uno más. */
export type LayoutMode = 'mobilePortrait' | 'mobileLandscape' | 'wide';

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width >= 900) return 'wide';
  if (width > height) return 'mobileLandscape';
  return 'mobilePortrait';
}

/** Ancho máximo del contenido en pantallas grandes. */
export const MAX_CONTENT_WIDTH = 1280;
