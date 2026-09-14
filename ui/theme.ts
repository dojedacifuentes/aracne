import { Platform } from 'react-native';

/**
 * Tokens de docs/DESIGN.md. Negro cálido, un solo acento. No hay colores
 * fuera de esta lista: si falta uno, la respuesta es no usarlo.
 */
export const colors = {
  bg: '#0E0D0C',
  surface: '#161412',
  line: '#2A2724',
  text: '#EDEAE3',
  dim: '#8A857D',
  accent: '#B5432E',
} as const;

/**
 * Serif editorial para leer; mono solo para datos e identificadores. Las dos
 * se cargan en App.tsx; en web, si no llegan, quedan las del sistema.
 */
export const fonts = {
  serif: Platform.select({
    web: 'Newsreader_400Regular, Georgia, "Times New Roman", serif',
    default: 'Newsreader_400Regular',
  }),
  mono: Platform.select({
    web: 'JetBrainsMono_400Regular, ui-monospace, Menlo, Consolas, monospace',
    default: 'JetBrainsMono_400Regular',
  }),
} as const;

export const space = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
} as const;

/** Área táctil mínima. */
export const HIT_SIZE = 44;

/** En la web no hay módulo nativo de animación: allí el driver es JS. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
