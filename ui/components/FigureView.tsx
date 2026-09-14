import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Corpus, Figure, Work } from '../../lib/content/corpus';
import { catalogId } from '../../lib/labels';
import { themeOf } from '../../lib/museum/themes';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Emblem } from './Emblem';
import { Reveal } from './Reveal';

type Props = {
  figure: Figure;
  corpus: Corpus;
  reduceMotion: boolean;
  onOpenEntry: (id: string) => void;
  onOpenTheme: (id: string) => void;
};

/** Qué hay al otro lado de un enlace, dicho sin adornos. */
const KIND_LABEL: Record<Work['kind'], string> = {
  texto: 'texto completo',
  facsimil: 'facsímil',
  archivo: 'archivo',
  ficha: 'ficha de la obra',
};

/**
 * Una biografía.
 *
 * Tres cosas, en este orden: **la idea** —algo que pensó, dicho de manera que
 * no se pueda adivinar—, **el hecho** —verificable y poco citado, nunca una
 * valoración de su obra— y **la obra**, cuando hay una que se pueda abrir de
 * verdad. Si no la hay, se dice que no la hay: una obra sin enlace sería una
 * cita de memoria, y CLAUDE.md prohíbe las URL inventadas.
 *
 * La composición es centrada y estrecha, con dos filetes: es una lápida, no
 * una ficha de catálogo. Ningún color nuevo; el peso lo hacen el espacio en
 * blanco y el tamaño de la serif.
 */
export function FigureView({ figure, corpus, reduceMotion, onOpenEntry, onOpenTheme }: Props) {
  const theme = themeOf(figure, corpus.themes);
  const entries = figure.entries
    .map((id) => corpus.entries.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  return (
    <View style={styles.column}>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <View style={styles.head}>
          <Emblem id={figure.id} emblem={figure.emblem} size={96} />
          <Text style={styles.name} accessibilityRole="header">
            {figure.name}
          </Text>
          <Text style={styles.years}>{figure.years}</Text>
          <Text style={styles.emblem}>{figure.emblem}</Text>
        </View>
      </Reveal>

      <Reveal index={1} reduceMotion={reduceMotion}>
        <Text style={styles.label}>la idea</Text>
        <Text style={styles.idea}>{figure.idea}</Text>
      </Reveal>

      <Reveal index={2} reduceMotion={reduceMotion}>
        <Text style={styles.label}>el hecho</Text>
        <Text style={styles.note}>{figure.note}</Text>
      </Reveal>

      <Reveal index={3} reduceMotion={reduceMotion}>
        <Text style={styles.label}>la obra</Text>
        {figure.works.length === 0 ? (
          <Text style={styles.empty}>
            todavía no hay ninguna obra suya que se pueda abrir desde aquí. cuando la haya, estará enlazada.
          </Text>
        ) : (
          figure.works.map((work) => <WorkLink key={work.url} work={work} />)
        )}
      </Reveal>

      {theme ? (
        <Reveal index={4} reduceMotion={reduceMotion}>
          <Text style={styles.label}>el tema</Text>
          <ThemeLink name={theme.name} criterion={theme.criterion} onPress={() => onOpenTheme(theme.id)} />
        </Reveal>
      ) : null}

      <Reveal index={5} reduceMotion={reduceMotion}>
        <Text style={styles.label}>en el archivo</Text>
        {entries.length === 0 ? (
          <Text style={styles.empty}>todavía no hay entradas ligadas a esta figura. añade una.</Text>
        ) : (
          entries.map((entry) => (
            <EntryLink key={entry.id} id={entry.id} title={entry.title} onPress={() => onOpenEntry(entry.id)} />
          ))
        )}
      </Reveal>
    </View>
  );
}

/**
 * Un enlace que sale de la aplicación. Dice adónde va y qué hay allí antes de
 * que nadie lo pulse: un enlace que no declara su destino es una trampa.
 */
function WorkLink({ work }: { work: Work }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={work.title}
      accessibilityHint={`se abre fuera de aracne, en ${work.where}`}
      onPress={() => void Linking.openURL(work.url)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.link, focusVisible && styles.focus]}
    >
      <Text style={[styles.linkText, hovered && styles.underline]}>{work.title}</Text>
      <Text style={styles.linkMeta}>
        {work.where} · {KIND_LABEL[work.kind]} ↗
      </Text>
    </Pressable>
  );
}

function ThemeLink({ name, criterion, onPress }: { name: string; criterion: string; onPress: () => void }) {
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
  column: { maxWidth: 620, width: '100%' },

  // La cabecera: emblema, nombre y años centrados entre dos filetes.
  head: {
    alignItems: 'center',
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    borderBottomColor: colors.line,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 44,
    color: colors.text,
    textAlign: 'center',
    marginTop: space.md,
  },
  years: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 2.4,
    color: colors.dim,
    marginTop: space.xs,
  },
  emblem: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.dim,
    marginTop: space.xs,
    textAlign: 'center',
  },

  label: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.8,
    color: colors.dim,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  idea: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 33,
    color: colors.text,
  },
  note: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 28,
    color: colors.dim,
  },

  link: {
    minHeight: HIT_SIZE,
    justifyContent: 'center',
    paddingVertical: space.xs,
    outlineWidth: 0,
  },
  linkText: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 26,
    color: colors.text,
  },
  linkMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    color: colors.dim,
  },
  // El identificador es uno de los dos únicos usos del acento.
  catalog: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.accent,
  },
  empty: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.dim,
  },
  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
