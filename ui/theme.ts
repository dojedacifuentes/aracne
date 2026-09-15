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

/**
 * La rampa del Atlas de la extinción, y el único sitio del proyecto donde hay
 * una. `docs/DESIGN.md` prohíbe los degradados y el segundo acento, y esto es
 * una excepción pedida expresamente: un mapa de calor sin rampa no es un mapa
 * de calor, es una mancha.
 *
 * Las condiciones de la excepción: **no hay color nuevo, hay uno estirado**.
 * La rampa va de la ceniza a la llama pasando por `--accent`, que es el tercer
 * tramo, así que el Atlas no introduce una familia de color ajena al resto.
 * Y no sale de `/atlas`.
 */
export const heat = ['#1C1A17', '#4A2C20', '#8C3A22', '#B5432E', '#E2703A'] as const;

/**
 * El frío de la máquina: retículas, escuadras, barrido y cifras vivas. Es el
 * contraste que hace que la brasa se lea como brasa. Solo en el Atlas, solo
 * en la capa del instrumento, nunca en el contenido.
 */
export const machine = '#5FCBC3';

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
