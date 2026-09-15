import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LegState } from '../../lib/content/corpus';
import { useFocusRing } from '../hooks/useFocusRing';
import { legHint } from '../lib/copy';
import { textGlyph } from '../lib/glyph';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { Sigil } from './Sigil';

type Props = {
  legs: LegState[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /** Quitar todas de golpe: una consola necesita un interruptor general. */
  onClear: () => void;
};

/**
 * Las once patas, como interruptores.
 *
 * Antes orbitaban alrededor de la araña y tendían un hilo hacia ella. Se
 * quitó por decisión expresa: con varias apoyadas, los hilos cruzaban por
 * encima del animal y tapaban justo lo que había que mirar. Aquí son lo que
 * de verdad son —**once conmutadores**— y se comportan como tales: se ve
 * cuáles están puestos, cuántas entradas tiene cada uno y cuál no llega al
 * mínimo para encenderse.
 *
 * El sello de cada pata sale de su posición en el anillo, así que el orden
 * sigue siendo el de afinidad aunque ya no se dibuje en círculo.
 */
export function LegPanel({ legs, selected, onToggle, onClear }: Props) {
  const puestas = legs.filter((leg) => selected.includes(leg.category.id)).length;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.label}>las once patas</Text>
        <Text style={[styles.count, puestas > 0 && styles.countOn]}>
          {puestas > 0 ? `${puestas} apoyadas` : 'ninguna'}
        </Text>
      </View>

      {legs.map((leg) => (
        <LegSwitch
          key={leg.category.id}
          leg={leg}
          on={selected.includes(leg.category.id)}
          onPress={() => onToggle(leg.category.id)}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="soltar todas"
        accessibilityHint="deja el anillo en reposo"
        disabled={puestas === 0}
        onPress={onClear}
        style={[styles.clear, puestas === 0 && styles.clearOff]}
      >
        <Text style={styles.clearText}>soltar todas</Text>
      </Pressable>
    </View>
  );
}

function LegSwitch({ leg, on, onPress }: { leg: LegState; on: boolean; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const activo = on || hovered;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={leg.category.name}
      accessibilityHint={legHint(leg.count, leg.visible, leg.missing, on)}
      accessibilityState={{ checked: on, disabled: !leg.visible }}
      disabled={!leg.visible}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.row, on && styles.rowOn, !leg.visible && styles.rowOff, focusVisible && styles.focus]}
    >
      <View style={[styles.bar, on && styles.barOn]} />
      <View style={styles.sigil}>
        <Sigil leg={leg.category.leg} size={26} hollow strong={activo} />
        <Text style={[styles.glyph, activo && styles.glyphOn]}>{textGlyph(leg.category.glyph)}</Text>
      </View>
      <Text style={[styles.name, activo && styles.nameOn]} numberOfLines={1}>
        {leg.category.name}
      </Text>
      <Text style={[styles.state, on && styles.stateOn]}>
        {leg.visible ? (on ? 'ON' : String(leg.count).padStart(2, '0')) : `−${leg.missing}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  count: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.dim },
  countOn: { color: machine },

  row: {
    minHeight: HIT_SIZE - 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingRight: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    outlineWidth: 0,
  },
  rowOn: { backgroundColor: colors.bg },
  rowOff: { opacity: 0.42 },
  bar: { width: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  barOn: { backgroundColor: machine },

  sigil: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  glyph: {
    position: 'absolute',
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 16,
    color: colors.dim,
  },
  glyphOn: { color: colors.text },

  name: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.dim },
  nameOn: { color: colors.text },
  state: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.line, width: 26, textAlign: 'right' },
  stateOn: { color: machine },

  clear: {
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  clearOff: { opacity: 0.35 },
  clearText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: colors.dim, textTransform: 'uppercase' },

  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
