import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { rngFromString } from '../../lib/oracle/rng';
import { colors } from '../theme';

type Props = {
  /** Id de la figura: el emblema dibujado vive en public/figures/<id>.svg. */
  id: string;
  /** La descripción del emblema, que es el texto alternativo. */
  emblem: string;
  size?: number;
};

/** La rejilla del espectro. Dieciséis, como los sprites de 32 vistos a la mitad. */
const GRID = 16;

/**
 * El sprite de un autor.
 *
 * Primero, el emblema dibujado a mano de `public/figures/<id>.svg`: cuarenta y
 * cuatro objetos de 32×32 píxeles, uno por figura, que son lo mejor que tiene
 * este archivo y no se sustituyen por nada.
 *
 * Cuando no hay dibujo —y con cientos de autores no lo habrá— entra un
 * **espectro**: una silueta de busto rellena de ruido sacado del identificador
 * con el PRNG sembrado del proyecto (CLAUDE.md, regla 3: nada de
 * `Math.random()`). Es determinista, así que la misma persona tiene siempre la
 * misma cara de máquina, y se dibuja con los seis tokens, sin color nuevo.
 *
 * No es un avatar genérico: es una **ficha pendiente**, y lo dice con su marco
 * de trazos, como pedía el gabinete. El día que alguien dibuje su emblema, el
 * espectro desaparece solo.
 */
export function AuthorSprite({ id, emblem, size = 48 }: Props) {
  const [missing, setMissing] = useState(false);
  const box = { width: size, height: size };

  if (missing) {
    return (
      <View style={[styles.hueco, box]} accessibilityLabel={`sin emblema todavía: ${emblem}`}>
        <Spectre id={id} size={size - 6} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: `/figures/${id}.svg` }}
      style={box}
      resizeMode="contain"
      accessibilityLabel={emblem}
      onError={() => setMissing(true)}
    />
  );
}

/**
 * El espectro: busto de frente en una rejilla de 16×16, simétrico respecto al
 * eje, con el relleno decidido por la semilla. La silueta es siempre la misma
 * —hombros, cuello, cabeza— para que la fila de autores no parezca una tirada
 * de dados; lo que cambia es la trama de dentro y dos marcas a la altura de
 * los ojos.
 */
function Spectre({ id, size }: { id: string; size: number }) {
  const rng = rngFromString(`espectro|${id}`);
  const unidad = size / GRID;
  const pixeles: { x: number; y: number; c: string }[] = [];

  const dentro = (x: number, y: number) => {
    // Hombros: dos filas anchas abajo. Cuello: dos columnas. Cabeza: bloque.
    if (y >= 13) return x >= 2 && x <= 13;
    if (y >= 11) return x >= 4 && x <= 11;
    if (y >= 10) return x >= 6 && x <= 9;
    if (y >= 2) return x >= 4 && x <= 11;
    return false;
  };

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID / 2; x += 1) {
      if (!dentro(x, y)) continue;
      const v = rng();
      // Tres tonos, nunca el acento: el acento es del identificador y del foco.
      const c = v > 0.72 ? colors.dim : v > 0.34 ? colors.line : colors.surface;
      pixeles.push({ x, y, c });
      pixeles.push({ x: GRID - 1 - x, y, c });
    }
  }

  // Los ojos: dos huecos fijos que convierten la trama en una cara.
  for (const x of [5, 10]) pixeles.push({ x, y: 6, c: colors.text });

  return (
    <Svg width={size} height={size} shouldRasterizeIOS>
      {pixeles.map((p) => (
        <Rect
          key={`${p.x}|${p.y}|${p.c}`}
          x={p.x * unidad}
          y={p.y * unidad}
          width={unidad}
          height={unidad}
          fill={p.c}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  hueco: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
