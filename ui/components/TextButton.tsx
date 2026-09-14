import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, text } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  hint?: string;
};

/**
 * El botón de docs/DESIGN.md: un rectángulo con borde de 1 px en `--line`,
 * texto en serif y sin relleno. Al pasar por encima el borde pasa a `--text`;
 * nunca cambia de color de fondo.
 */
export function TextButton({ label, onPress, hint }: Props) {
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
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  hovered: { borderColor: colors.text },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
  label: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.text,
  },
});
