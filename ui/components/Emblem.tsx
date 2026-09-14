import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, text } from '../theme';

type Props = {
  /** Id de la figura: el emblema vive en public/figures/<id>.svg. */
  id: string;
  /** La descripción visual de content/figures.json, que es el texto alternativo. */
  emblem: string;
  size?: number;
};

/**
 * El emblema de una figura. docs/MUSEO.md: ningún retrato, un objeto, y las
 * figuras que todavía no tienen sprite muestran **un hueco marcado**, nunca un
 * icono genérico. El hueco no es un error: dice que ese dibujo está pendiente.
 *
 * Si existe o no se sabe cargando, no consultando una lista: una lista se
 * desincroniza en cuanto alguien añade un archivo.
 */
export function Emblem({ id, emblem, size = 64 }: Props) {
  const [missing, setMissing] = useState(false);
  const box = { width: size, height: size };

  if (missing) {
    return (
      <View style={[styles.hole, box]} accessibilityLabel={`sin emblema todavía: ${emblem}`}>
        <Text style={styles.holeMark}>·</Text>
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

const styles = StyleSheet.create({
  hole: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeMark: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
  },
});
