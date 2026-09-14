import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LegState } from '../../lib/content/corpus';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space, text } from '../theme';
import { LegButton } from './LegButton';

/** Los sitios a los que se puede ir desde cualquier parte. */
export type Place = 'invocar' | 'archivo' | 'gabinete' | 'propósito';

type Props = {
  legs: LegState[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onGo: (place: Place) => void;
  /** El sitio en el que se está, o null si se está leyendo algo suelto. */
  here: Place | null;
};

const PLACES: Place[] = ['invocar', 'archivo', 'gabinete', 'propósito'];

/**
 * La columna que no cambia.
 *
 * Antes cada vista se dibujaba sola y `volver` te devolvía al principio: once
 * patas que solo se veían en la portada y ningún sitio desde el que saltar a
 * otro. Eso hacía de cada pantalla un callejón, y por eso no se podían
 * conectar puntos.
 *
 * Aquí el anillo entero y los cuatro sitios están delante en todas las rutas.
 * No es decoración: es lo que dice dónde estás y qué hay al lado.
 */
export function Rail({ legs, selected, onToggle, onGo, here }: Props) {
  const lit = legs.filter((leg) => leg.visible).length;

  return (
    <View style={styles.rail}>
      <Text style={styles.label}>patas</Text>
      <View style={styles.legs}>
        {legs.map((leg) => (
          <LegButton
            key={leg.category.id}
            glyph={leg.category.glyph}
            name={leg.category.name}
            count={leg.count}
            lit={leg.visible}
            missing={leg.missing}
            selected={selected.includes(leg.category.id)}
            onPress={() => onToggle(leg.category.id)}
          />
        ))}
      </View>
      <Text style={styles.note}>
        {lit} de {legs.length} encendidas
      </Text>

      <Text style={[styles.label, styles.spaced]}>ir a</Text>
      {PLACES.map((place) => (
        <PlaceLink key={place} name={place} on={place === here} onPress={() => onGo(place)} />
      ))}
      <Text style={styles.note}>⌘K para buscar</Text>
    </View>
  );
}

function PlaceLink({ name, on, onPress }: { name: Place; on: boolean; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={name}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.place, on && styles.placeOn, focusVisible && styles.focus]}
    >
      <Text style={[styles.placeText, (on || hovered) && styles.here]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { width: 232 },
  label: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    marginBottom: space.xs,
  },
  spaced: { marginTop: space.lg },
  legs: { marginBottom: space.xs },
  note: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: space.xs,
  },

  place: {
    minHeight: HIT_SIZE - 8,
    justifyContent: 'center',
    paddingLeft: space.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    outlineWidth: 0,
  },
  // Donde estás se marca con una barra en el margen, no con color.
  placeOn: { borderLeftColor: colors.text },
  placeText: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.dim,
  },
  here: { color: colors.text },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
