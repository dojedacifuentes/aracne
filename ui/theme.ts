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
 * Los siete tamaños de texto que existen. Antes había once, puestos a ojo
 * pantalla por pantalla, y esa es la razón de que el conjunto no sonara
 * afinado: 17, 18 y 19 hacían el mismo trabajo con tres cuerpos distintos.
 *
 * Aquí 17/18/19 son `body` y 20/21/22 son `lead`. No es la escala 1.25 entera
 * —eso movería casi todos los textos— sino el mismo repertorio con los
 * duplicados colapsados y el interlineado fijado a cada cuerpo, que es lo que
 * de verdad se ve descuadrado cuando dos bloques vecinos no lo comparten.
 *
 * `data` es el único que lleva letter-spacing: es la mono, y solo para datos.
 */
export const text = {
  data: { fontSize: 12, lineHeight: 18, letterSpacing: 0.72 },
  small: { fontSize: 15, lineHeight: 22 },
  body: { fontSize: 18, lineHeight: 30 },
  lead: { fontSize: 21, lineHeight: 29 },
  title: { fontSize: 24, lineHeight: 33 },
  display: { fontSize: 30, lineHeight: 38 },
  hero: { fontSize: 42, lineHeight: 50 },
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
