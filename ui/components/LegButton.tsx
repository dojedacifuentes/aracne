import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { legHint } from '../lib/copy';
import { textGlyph } from '../lib/glyph';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Sigil } from './Sigil';

type Props = {
  /** Posición en el anillo: de ella sale el sello. */
  leg: number;
  glyph: string;
  name: string;
  count: number;
  /** Encendida: tiene entradas suficientes para apoyarse. */
  lit: boolean;
  /** Entradas que le faltan para encenderse. */
  missing: number;
  selected: boolean;
  onPress: () => void;
};

/**
 * Una pata en la fila de móvil, donde el anillo de la portada no cabe: once
 * sellos de 44 px en una circunferencia pedirían una pantalla que no existe.
 * Dice exactamente lo mismo que un nodo del anillo —mismo sello, mismo glifo,
 * mismo texto de apoyo— y tiende su hilo hacia abajo al apoyarse.
 */
export function LegButton({ leg, glyph, name, count, lit, missing, selected, onPress }: Props) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={!lit}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={legHint(count, lit, missing, selected)}
      accessibilityState={{ disabled: !lit, selected }}
      style={({ pressed }) => [
        styles.node,
        styles.focusable,
        focusVisible && styles.focus,
        !lit && styles.retracted,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.sello}>
        <View style={styles.selloLayer} pointerEvents="none">
          <Sigil leg={leg} size={HIT_SIZE} hollow strong={selected} />
        </View>
        <Text style={[styles.glyph, selected && styles.on]} maxFontSizeMultiplier={1.2}>
          {textGlyph(glyph)}
        </Text>
      </View>
      <View style={[styles.thread, { height: selected ? 10 : 0 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    width: HIT_SIZE + 8,
    minHeight: HIT_SIZE + 14,
    alignItems: 'center',
  },
  sello: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selloLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  thread: {
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.text,
    marginTop: space.xs,
  },
  glyph: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
    color: colors.dim,
    textAlign: 'center',
  },
  on: { color: colors.text },
  focusable: { outlineWidth: 0 },
  // El foco es uno de los dos únicos usos del acento.
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
  retracted: { opacity: 0.42 },
  pressed: { opacity: 0.7 },
});
