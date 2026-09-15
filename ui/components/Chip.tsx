import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { useTouchHeight } from '../hooks/useTouch';
import { colors, fonts, machine, space } from '../theme';

type Props = {
  label: string;
  on: boolean;
  onPress: () => void;
  /** Qué hace, para quien navega con lector de pantalla. */
  hint?: string;
  /** Una cifra a la derecha: cuántas entradas trae el filtro. */
  count?: number;
};

/**
 * El conmutador pequeño de la consola.
 *
 * Había tres copias de esto —en la tela, en el Atlas y en el archivo— con la
 * misma forma y tres colores de selección distintos. Ahora es una, y sigue la
 * regla de la fase 15: **el frío es de lo que se puede tocar**. Puesto, el
 * borde se enfría y la etiqueta sube a texto; la cifra va siempre en frío,
 * como el estado de las patas.
 *
 * No cambia de fondo al elegirlo: en este proyecto la selección se dice con el
 * trazo, nunca con una superficie de color.
 */
export function Chip({ label, on, onPress, hint, count }: Props) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const alto = useTouchHeight();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint ?? (count === undefined ? undefined : `${count} entradas`)}
      accessibilityState={{ selected: on }}
      // Un filtro es un botón que se queda pulsado, así que el atributo es
      // `aria-pressed`. React Native Web no traduce `accessibilityState`.
      aria-pressed={on}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.chip, { minHeight: alto }, on && styles.chipOn, focusVisible && styles.focus]}
    >
      <Text style={[styles.text, on && styles.textOn]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
      {count === undefined ? null : <Text style={styles.count}>{count}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  chipOn: { borderColor: machine },
  text: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, color: colors.dim },
  textOn: { color: colors.text },
  count: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: machine },
  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
