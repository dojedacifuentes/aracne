import Svg, { Circle, Polygon } from 'react-native-svg';

import { legSigil, markSigil, type Sigil as Shape } from '../lib/sigil';
import { colors } from '../theme';

type Props = {
  /** El sello de una pata, por su posición en el anillo. */
  leg?: number;
  /** El sello de un botón, por su etiqueta. */
  mark?: string;
  size: number;
  /** Deja el centro libre: ahí va el glifo de la categoría. */
  hollow?: boolean;
  /** Apoyada, o con el cursor encima: el trazo sube a `--text`. */
  strong?: boolean;
};

/**
 * Dibuja un sello. Trazo de un píxel, sin relleno y sin color propio: el
 * estado se dice subiendo el trazo de `--line` a `--text`, nunca con un
 * segundo color (docs/DESIGN.md).
 */
export function Sigil({ leg, mark, size, hollow = false, strong = false }: Props) {
  const shape: Shape = leg === undefined ? markSigil(mark ?? '') : legSigil(leg);
  const stroke = strong ? colors.text : colors.line;
  const P = (v: number) => v * size;
  const points = (cycle: Shape['star'][number]) => cycle.map((p) => `${P(p.x)},${P(p.y)}`).join(' ');

  return (
    <Svg width={size} height={size} pointerEvents="none">
      {shape.rings.map((r) => (
        <Circle key={r} cx={P(0.5)} cy={P(0.5)} r={P(r)} fill="none" stroke={stroke} strokeWidth={1} />
      ))}
      {shape.star.map((cycle, i) => (
        <Polygon key={`s${i}`} points={points(cycle)} fill="none" stroke={stroke} strokeWidth={1} />
      ))}
      {hollow
        ? null
        : shape.core.map((cycle, i) => (
            <Polygon key={`c${i}`} points={points(cycle)} fill="none" stroke={stroke} strokeWidth={1} />
          ))}
    </Svg>
  );
}
