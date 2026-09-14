import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Corpus, Figure } from '../../lib/content/corpus';
import { catalogId } from '../../lib/labels';
import { roomsOf } from '../../lib/museum/rooms';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space, text } from '../theme';
import { Emblem } from './Emblem';
import { Reveal } from './Reveal';

type Props = {
  figure: Figure;
  corpus: Corpus;
  reduceMotion: boolean;
  onOpenEntry: (id: string) => void;
  onOpenRoom: (id: string) => void;
};

/**
 * La ficha de una figura: el emblema, el nombre, los años, la nota y las
 * entradas ligadas.
 *
 * La nota es un hecho verificable y poco citado, nunca una valoración de la
 * obra (docs/MUSEO.md). Se muestra tal cual, sin comillas y sin presentarla
 * como curiosidad: es el contenido de la ficha, no un adorno.
 */
export function FigureView({ figure, corpus, reduceMotion, onOpenEntry, onOpenRoom }: Props) {
  const rooms = roomsOf(figure, corpus.rooms);
  const entries = figure.entries
    .map((id) => corpus.entries.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  return (
    <View style={styles.column}>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <View style={styles.head}>
          <Emblem id={figure.id} emblem={figure.emblem} size={96} />
          <View style={styles.headText}>
            <Text style={styles.name} accessibilityRole="header">
              {figure.name}
            </Text>
            <Text style={styles.years}>{figure.years}</Text>
            <Text style={styles.emblem}>{figure.emblem}</Text>
          </View>
        </View>
      </Reveal>

      <Reveal index={1} reduceMotion={reduceMotion}>
        <Text style={styles.note}>{figure.note}</Text>
      </Reveal>

      <Reveal index={2} reduceMotion={reduceMotion}>
        <Text style={styles.label}>salas</Text>
        {rooms.map((room) => (
          <RoomLink key={room.id} name={room.name} criterion={room.criterion} onPress={() => onOpenRoom(room.id)} />
        ))}
      </Reveal>

      <Reveal index={3} reduceMotion={reduceMotion}>
        <Text style={styles.label}>en el archivo</Text>
        {entries.length === 0 ? (
          <Text style={styles.empty}>todavía no hay entradas ligadas a esta figura. añade una.</Text>
        ) : (
          entries.map((entry) => (
            <EntryLink
              key={entry.id}
              id={entry.id}
              title={entry.title}
              onPress={() => onOpenEntry(entry.id)}
            />
          ))
        )}
      </Reveal>
    </View>
  );
}

function RoomLink({ name, criterion, onPress }: { name: string; criterion: string; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={name}
      accessibilityHint={criterion}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.link, focusVisible && styles.focus]}
    >
      <Text style={[styles.linkText, hovered && styles.underline]}>{name}</Text>
      <Text style={styles.linkMeta} numberOfLines={2}>
        {criterion}
      </Text>
    </Pressable>
  );
}

function EntryLink({ id, title, onPress }: { id: string; title: string; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      accessibilityHint="abre la entrada"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.link, focusVisible && styles.focus]}
    >
      <Text style={styles.catalog}>{catalogId(id)}</Text>
      <Text style={[styles.linkText, hovered && styles.underline]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { maxWidth: 640, width: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  headText: { flex: 1, marginLeft: space.md },
  name: {
    fontFamily: fonts.serif,
    ...text.display,
    color: colors.text,
  },
  years: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: space.xs,
  },
  emblem: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.dim,
    marginTop: space.xs,
  },
  note: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.text,
    marginTop: space.lg,
  },
  label: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: space.lg,
    marginBottom: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  link: {
    minHeight: HIT_SIZE,
    justifyContent: 'center',
    paddingVertical: space.xs,
    outlineWidth: 0,
  },
  linkText: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.text,
  },
  linkMeta: {
    fontFamily: fonts.serif,
    ...text.small,
    color: colors.dim,
  },
  // El identificador es uno de los dos únicos usos del acento.
  catalog: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.accent,
  },
  empty: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.dim,
  },
  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
