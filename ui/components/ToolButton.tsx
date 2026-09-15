import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { useTouchHeight } from '../hooks/useTouch';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  /** Abre o cierra algo: se anuncia como `aria-expanded`. */
  expanded?: boolean;
  hint?: string;
  /** Una cifra colgada a la derecha: cuántos filtros hay puestos, por ejemplo. */
  count?: number;
};

/**
 * El control de la máquina: `[ expediente ]`, `[ filtros ]`, `[ lente ]`.
 *
 * Es el único disparador de todo lo que está oculto por defecto. Va entre
 * corchetes porque así se nombran las teclas en un manual, en mono y en
 * versales, y se invierte al pasar por encima como una terminal. Cuando lo que
 * abre está abierto, se enfría: el frío es de lo que se puede tocar.
 */
export function ToolButton({ label, onPress, expanded, hint, count }: Props) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const alto = useTouchHeight();
  const abierto = expanded === true;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={expanded === undefined ? undefined : { expanded: abierto }}
      // React Native Web no traduce `accessibilityState.expanded`: el atributo
      // hay que ponerlo a mano, y sin él un lector de pantalla no sabe que
      // esto abre algo. Comprobado en el DOM, no supuesto.
      aria-expanded={expanded === undefined ? undefined : abierto}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.boton, { minHeight: alto }, abierto && styles.abierto, hovered && styles.sobre, focusVisible && styles.focus]}
    >
      <Text style={[styles.texto, abierto && styles.textoAbierto, hovered && styles.textoSobre]}>
        [ {label}
        {count !== undefined && count > 0 ? ` ${count}` : ''} ]
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: HIT_SIZE - 10,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  abierto: { borderColor: machine },
  sobre: { backgroundColor: colors.text, borderColor: colors.text },
  texto: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  textoAbierto: { color: machine },
  textoSobre: { color: colors.bg },
  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
