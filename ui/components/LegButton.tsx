import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space } from '../theme';

/** Fuerza la presentación como texto: sin esto, Windows pinta ♒ como emoji. */
const TEXT_PRESENTATION = String.fromCharCode(0xfe0e);

type Props = {
  glyph: string;
  name: string;
  count: number;
  /** Encendida: tiene entradas suficientes para apoyarse. */
  lit: boolean;
  /** Entradas que le faltan para encenderse. */
  missing: number;
  selected: boolean;
  /** Solo el glifo, para la fila de móvil. */
  compact?: boolean;
  onPress: () => void;
};

/**
 * Una pata: un botón real con tres estados. Retraída no se puede apoyar y dice
 * cuántas entradas le faltan; en reposo espera; apoyada tiende un hilo hacia la
 * araña. Ningún estado cambia de color: el acento está reservado al foco.
 */
export function LegButton({ glyph, name, count, lit, missing, selected, compact = false, onPress }: Props) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const hint = lit
    ? `${count} entradas. ${selected ? 'apoyada' : 'en reposo'}`
    : `retraída: faltan ${missing} ${missing === 1 ? 'entrada' : 'entradas'}`;

  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={!lit}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !lit, selected }}
      style={({ pressed }) => [
        compact ? styles.compact : styles.row,
        styles.focusable,
        focusVisible && styles.focus,
        !lit && styles.retracted,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.thread,
          compact
            ? { width: StyleSheet.hairlineWidth * 2, height: selected ? 14 : 0 }
            : { height: StyleSheet.hairlineWidth * 2, width: selected ? 22 : 0 },
        ]}
      />
      <Text style={[styles.glyph, selected && styles.on]} maxFontSizeMultiplier={1.4}>
        {glyph + TEXT_PRESENTATION}
      </Text>
      {compact ? null : (
        <>
          <Text style={[styles.name, selected && styles.on]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {name}
          </Text>
          <Text style={styles.meta} maxFontSizeMultiplier={1.4}>
            {lit ? count : `faltan ${missing}`}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compact: {
    width: HIT_SIZE,
    minHeight: HIT_SIZE + 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: space.xs,
  },
  thread: {
    backgroundColor: colors.text,
    marginRight: 6,
  },
  glyph: {
    width: 28,
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.dim,
    textAlign: 'center',
  },
  name: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.dim,
    marginLeft: space.xs,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginLeft: space.sm,
  },
  on: { color: colors.text },
  focusable: { outlineWidth: 0 },
  // El foco es uno de los dos únicos usos del acento.
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
  retracted: { opacity: 0.42 },
  pressed: { opacity: 0.7 },
});
