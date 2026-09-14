import { StyleSheet, Text, View } from 'react-native';

import type { LegState } from '../../lib/content/corpus';
import { textGlyph } from '../lib/glyph';
import { colors, fonts, space, text } from '../theme';
import { Reveal } from './Reveal';

type Props = {
  legs: readonly LegState[];
  selected: readonly string[];
  reduceMotion: boolean;
};

/**
 * Propósito, donde el tarot tenía CONJETURA. Sin patas apoyadas dice para qué
 * sirve el archivo; con patas, para qué sirve cada una. No inventa nada: el
 * primer caso resume «Qué es» de CLAUDE.md y el segundo lee la descripción de
 * cada categoría.
 */
export function PurposeView({ legs, selected, reduceMotion }: Props) {
  const chosen = legs.filter((leg) => selected.includes(leg.category.id));
  const lit = legs.filter((leg) => leg.visible).length;

  if (chosen.length === 0) {
    const lines = [
      'Una araña sobre una red. Cada pata es una categoría del archivo y la red es lo que une unas entradas con otras.',
      'Se apoyan las patas que se quieran, se pulsa la araña y sale algo que no se estaba buscando: una entrada, dos con lo que las une y lo que las separa, tres a la vez o una deriva.',
      `Una pata se enciende sola cuando su categoría llega a tres entradas. Ahora hay ${lit} encendidas de ${legs.length}.`,
    ];
    return (
      <View>
        <Reveal index={0} reduceMotion={reduceMotion}>
          <Text style={styles.label}>propósito</Text>
        </Reveal>
        {lines.map((line, index) => (
          <Reveal key={line} index={index + 1} reduceMotion={reduceMotion}>
            <Text style={styles.body}>{line}</Text>
          </Reveal>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <Text style={styles.label}>
          {chosen.length === 1 ? 'propósito de la pata apoyada' : `propósito de las ${chosen.length} patas apoyadas`}
        </Text>
      </Reveal>
      {chosen.map((leg, index) => (
        <Reveal key={leg.category.id} index={index + 1} reduceMotion={reduceMotion}>
          <View style={styles.leg}>
            <Text style={styles.name}>
              {textGlyph(leg.category.glyph)} {leg.category.name}
            </Text>
            <Text style={styles.body}>{leg.category.description}</Text>
            <Text style={styles.meta}>{leg.count} entradas</Text>
          </View>
        </Reveal>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginBottom: space.sm,
  },
  body: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.text,
    marginBottom: space.sm,
  },
  leg: { marginBottom: space.md },
  name: {
    fontFamily: fonts.serif,
    ...text.lead,
    color: colors.text,
    marginBottom: space.xs,
  },
  meta: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
  },
});
