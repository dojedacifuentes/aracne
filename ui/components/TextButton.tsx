import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Sigil } from './Sigil';

type Props = {
  label: string;
  onPress: () => void;
  hint?: string;
  /** Sin sello: en una fila de botones secundarios la marca sobra. */
  bare?: boolean;
};

/**
 * El botón de docs/DESIGN.md: un rectángulo con borde de 1 px en `--line`,
 * texto en serif y sin relleno. Al pasar por encima el borde pasa a `--text`;
 * nunca cambia de color de fondo.
 *
 * Delante del texto va su sello, derivado de la etiqueta y siempre el mismo.
 * Es la misma marca que llevan las patas, en pequeño: la interfaz entera
 * habla una sola lengua geométrica en lugar de repartir iconos prestados.
 */
export function TextButton({ label, onPress, hint, bare = false }: Props) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={({ pressed }) => [styles.button, (hovered || pressed) && styles.hovered, focusVisible && styles.focus]}
    >
      {bare ? null : (
        <View style={styles.mark} pointerEvents="none">
          <Sigil mark={label} size={16} strong={hovered} />
        </View>
      )}
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: HIT_SIZE,
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  mark: { marginRight: space.xs },
  hovered: { borderColor: colors.text },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
  label: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text,
  },
});
