import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Figure } from '../../lib/content/corpus';
import type { RoomState } from '../../lib/museum/rooms';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Emblem } from './Emblem';
import { Reveal } from './Reveal';

type RoomsProps = {
  rooms: RoomState[];
  reduceMotion: boolean;
  onOpenRoom: (id: string) => void;
};

/**
 * Las siete salas. El criterio va siempre junto al nombre, sin desplegar y sin
 * abreviar, porque en este gabinete **el criterio es el contenido**: la lista
 * de quién está dentro vale mucho menos que la razón por la que está.
 */
export function RoomsView({ rooms, reduceMotion, onOpenRoom }: RoomsProps) {
  return (
    <View>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <Text style={styles.section}>el gabinete</Text>
        <Text style={styles.lead}>
          treinta figuras en siete salas. ninguna se representa por su cara: cada una tiene un objeto.
        </Text>
      </Reveal>
      {rooms.map((state, index) => (
        <Reveal key={state.room.id} index={index + 1} reduceMotion={reduceMotion}>
          <RoomRow state={state} onPress={() => onOpenRoom(state.room.id)} />
        </Reveal>
      ))}
    </View>
  );
}

function RoomRow({ state, onPress }: { state: RoomState; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const count = state.figures.length;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={state.room.name}
      accessibilityHint={`${count} figuras. ${state.room.criterion}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.room, focusVisible && styles.focus]}
    >
      <Text style={[styles.roomName, hovered && styles.underline]}>{state.room.name}</Text>
      <Text style={styles.criterion}>{state.room.criterion}</Text>
      <Text style={styles.count}>
        {count} figuras
        {state.entries.length > 0 ? ` · ${state.entries.length} entradas ligadas` : ' · sin entradas ligadas'}
      </Text>
    </Pressable>
  );
}

type RoomProps = {
  state: RoomState;
  reduceMotion: boolean;
  onOpenFigure: (id: string) => void;
};

/** Una sala: su criterio arriba, y las figuras con su emblema y sus años. */
export function RoomView({ state, reduceMotion, onOpenFigure }: RoomProps) {
  return (
    <View>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <Text style={styles.section}>sala</Text>
        <Text style={styles.title} accessibilityRole="header">
          {state.room.name}
        </Text>
        <Text style={styles.criterionLarge}>{state.room.criterion}</Text>
      </Reveal>
      {state.figures.map((figure, index) => (
        <Reveal key={figure.id} index={index + 1} reduceMotion={reduceMotion}>
          <FigureRow figure={figure} onPress={() => onOpenFigure(figure.id)} />
        </Reveal>
      ))}
    </View>
  );
}

export function FigureRow({ figure, onPress }: { figure: Figure; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={figure.name}
      accessibilityHint={`${figure.years}. ${figure.emblem}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.figure, focusVisible && styles.focus]}
    >
      <Emblem id={figure.id} emblem={figure.emblem} size={48} />
      <View style={styles.figureText}>
        <Text style={[styles.figureName, hovered && styles.underline]}>{figure.name}</Text>
        <Text style={styles.years}>
          {figure.years} · {figure.emblem}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginBottom: space.sm,
  },
  lead: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
    marginBottom: space.lg,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
  },
  criterionLarge: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
    marginTop: space.sm,
    marginBottom: space.lg,
  },

  room: {
    minHeight: HIT_SIZE,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
  },
  roomName: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 29,
    color: colors.text,
  },
  criterion: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.dim,
    marginTop: 2,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: space.xs,
  },

  figure: {
    minHeight: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
  },
  figureText: { flex: 1, marginLeft: space.md },
  figureName: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 27,
    color: colors.text,
  },
  years: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: 2,
  },

  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  // El foco es uno de los dos únicos usos del acento.
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
