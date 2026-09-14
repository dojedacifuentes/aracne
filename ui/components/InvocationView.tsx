import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Corpus } from '../../lib/content/corpus';
import { buildDrift, type DriftStep } from '../../lib/drift/graph';
import { catalogId, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import type { Invocation } from '../../lib/oracle/invoke';
import type { Entry } from '../../lib/schema';
import { useFocusRing } from '../hooks/useFocusRing';
import { bridgeText, dictumText, faultText, linkText, SHAPE_LABEL } from '../lib/copy';
import { colors, fonts, space, text } from '../theme';
import { Reveal } from './Reveal';

type Props = {
  invocation: Invocation | null;
  corpus: Corpus;
  seed: string;
  reduceMotion: boolean;
  /** Pantalla estrecha: el dictamen baja un punto. */
  compact: boolean;
  /** Abre el permalink de una entrada. Cada resultado tiene salida. */
  onOpen: (id: string) => void;
  /**
   * El corpus que vio el motor. Invocar desde una sala lo recorta, y la deriva
   * tiene que quedarse dentro del mismo recorte: si derivara sobre el archivo
   * entero, saldría de la sala por la primera arista.
   */
  pool: Entry[];
};

const DRIFT_LENGTH = 4;

type CategoryName = (id: string) => string | undefined;

/**
 * El resultado de pulsar, siempre en este orden: el dictamen, las entradas y,
 * si hay más de una, lo que las une y lo que las separa. El dictamen es la
 * línea grande: sin comillas y sin atribuirse a nadie.
 */
export function InvocationView({ invocation, corpus, seed, reduceMotion, compact, onOpen, pool }: Props) {
  const categoryName: CategoryName = (id) => corpus.categories.find((c) => c.id === id)?.name;

  if (!invocation) {
    return <Text style={styles.note}>con estas patas no sale nada. suelta alguna y vuelve a pulsar.</Text>;
  }

  const steps: DriftStep[] =
    invocation.shape === 'deriva'
      ? buildDrift(invocation.entries[0], pool, DRIFT_LENGTH, seed)
      : invocation.entries.map((entry) => ({ entry, link: null }));
  const many = invocation.entries.length > 1;
  const after = steps.length + 2;

  return (
    <View>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <Text style={styles.shape}>
          {SHAPE_LABEL[invocation.shape]} · {seed}
        </Text>
      </Reveal>
      <Reveal index={1} reduceMotion={reduceMotion}>
        <Text style={[styles.dictum, compact && styles.dictumCompact]} accessibilityRole="header">
          {dictumText(invocation, categoryName)}
        </Text>
      </Reveal>

      {steps.map((step, index) => (
        <Reveal key={step.entry.id} index={index + 2} reduceMotion={reduceMotion}>
          {step.link ? <Text style={styles.link}>por {linkText(step.link, categoryName)}</Text> : null}
          <EntryLine entry={step.entry} categoryName={categoryName} onOpen={onOpen} />
        </Reveal>
      ))}

      {invocation.shape === 'deriva' && steps.length === 1 ? (
        <Reveal index={after} reduceMotion={reduceMotion}>
          <Text style={styles.note}>esta entrada no tiene vecinos: la deriva termina aquí.</Text>
        </Reveal>
      ) : null}

      {many ? (
        <>
          <Reveal index={after + 1} reduceMotion={reduceMotion}>
            <Section label="lo que las une" text={bridgeText(invocation, categoryName)} />
          </Reveal>
          <Reveal index={after + 2} reduceMotion={reduceMotion}>
            <Section label="lo que las separa" text={faultText(invocation)} />
          </Reveal>
        </>
      ) : (
        <Reveal index={after + 1} reduceMotion={reduceMotion}>
          <Section label="la pregunta" text={invocation.entries[0].question} />
        </Reveal>
      )}
    </View>
  );
}

function EntryLine({
  entry,
  categoryName,
  onOpen,
}: {
  entry: Entry;
  categoryName: CategoryName;
  onOpen: (id: string) => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const unverified = entry.epistemicStatus === 'unverified';
  // CLAUDE.md: el estado epistémico siempre se ve cuando no es un hecho.
  const status = entry.epistemicStatus === 'fact' ? null : STATUS_LABEL[entry.epistemicStatus];
  const meta = [TYPE_LABEL[entry.type], ...entry.categories.map((id) => categoryName(id) ?? id)].join(' · ');

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${entry.title}. ${meta}`}
      accessibilityHint="abre la entrada"
      onPress={() => onOpen(entry.id)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.entry, focusVisible && styles.focus]}
    >
      <Text style={styles.catalog}>{catalogId(entry.id)}</Text>
      <Text style={[styles.title, hovered && styles.titleHovered]}>{entry.title}</Text>
      <Text style={styles.meta}>
        {meta}
        {status ? <Text style={unverified && styles.unverified}> · {status}</Text> : null}
      </Text>
    </Pressable>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shape: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginBottom: space.sm,
  },
  dictum: {
    fontFamily: fonts.serif,
    ...text.display,
    color: colors.text,
    marginBottom: space.lg,
  },
  dictumCompact: { ...text.title, marginBottom: space.md },
  entry: { marginBottom: space.md, outlineWidth: 0 },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 4 },
  link: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginBottom: space.xs,
  },
  // El identificador es uno de los dos únicos usos del acento.
  catalog: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.serif,
    ...text.lead,
    color: colors.text,
    marginTop: 2,
  },
  titleHovered: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  meta: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: 4,
  },
  unverified: { color: colors.accent },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingTop: space.sm,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
  },
  sectionText: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.text,
    marginTop: 4,
  },
  note: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.dim,
  },
});
