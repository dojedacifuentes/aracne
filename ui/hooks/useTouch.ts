import { useWindowDimensions } from 'react-native';

import { HIT_SIZE } from '../theme';

/** Por debajo de esto se toca con el dedo, no con un cursor. */
const ESTRECHO = 900;

/**
 * El alto mínimo de algo que se pulsa.
 *
 * Con ratón, un conmutador de treinta y cuatro píxeles se acierta siempre y
 * deja la consola densa, que es lo que este proyecto quiere. Con el dedo, no:
 * el mínimo son cuarenta y cuatro, y medido en un teléfono había una docena de
 * mandos por debajo. Un mismo componente, dos tamaños, y lo decide el ancho de
 * la ventana y no una suposición sobre el dispositivo.
 */
export function useTouchHeight(): number {
  const { width } = useWindowDimensions();
  return width < ESTRECHO ? HIT_SIZE : HIT_SIZE - 10;
}
