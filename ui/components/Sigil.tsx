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
 * Dibuja un sello: el marco poligonal, la estrella y los remates de los
 * vértices. Trazo fino, sin relleno salvo el fondo del marco, y sin color
 * propio: el estado se dice subiendo el trazo de `--line` a `--text` y
 * engordándolo un pelo, nunca con un segundo color (docs/DESIGN.md).
 */
export function Sigil({ leg, mark, size, hollow = false, strong = false }: Props) {
  const shape: Shape = leg === undefined ? markSigil(mark ?? '') : legSigil(leg);
  const stroke = strong ? colors.text : colors.line;
  const P = (v: number) => v * size;
  const points = (cycle: readonly { x: number; y: number }[]) =>
    cycle.map((p) => `${P(p.x)},${P(p.y)}`).join(' ');
  // A tamaño de icono, medio píxel de más ensucia; a tamaño de pata, hace falta.
  const grosor = size >= 32 ? (strong ? 1.25 : 1) : strong ? 1 : 0.85;

  return (
    <Svg width={size} height={size} pointerEvents="none">
      {/* El marco, con el fondo dentro: separa el sello de lo que haya detrás. */}
      <Polygon
        points={points(shape.frame)}
        fill={colors.bg}
        fillOpacity={0.55}
        stroke={stroke}
        strokeWidth={grosor}
        strokeLinejoin="round"
      />
      {shape.star.map((cycle, i) => (
        <Polygon
          key={`s${i}`}
          points={points(cycle)}
          fill="none"
          stroke={stroke}
          strokeWidth={grosor * (hollow ? 0.75 : 1)}
          strokeLinejoin="round"
          opacity={hollow ? 0.55 : 1}
        />
      ))}
      {/* Los remates. Son lo que hace que se lea como grabado. */}
      {size >= 28
        ? shape.studs.map((p, i) => (
            <Circle key={`v${i}`} cx={P(p.x)} cy={P(p.y)} r={grosor * 0.9} fill={stroke} />
          ))
        : null}
    </Svg>
  );
}
