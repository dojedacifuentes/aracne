import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Corpus } from '../../lib/content/corpus';
import { catalogId, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import { figuresOfEntry } from '../../lib/museum/rooms';
import type { Entry } from '../../lib/schema';
import { STATUS_BORDER, type StatusBorder } from '../lib/epistemic';
import { colors, fonts, space, text } from '../theme';
import { Reveal } from './Reveal';

type Props = {
  entry: Entry;
  corpus: Corpus;
  reduceMotion: boolean;
  /** Pantalla estrecha: título a 30 px en lugar de 42. */
  compact: boolean;
  /** Abre la figura del gabinete que reclama esta entrada. */
  onOpenFigure: (id: string) => void;
};

/** El identificador cuenta hasta su número en 200 ms: el único gesto de «procesamiento». */
const COUNTER_MS = 200;

/**
 * Una entrada, como una ficha de catálogo razonado (docs/DESIGN.md):
 * identificador en mono, título en serif, cuerpo con el estado epistémico en
 * el borde izquierdo, la pregunta tras un blanco generoso y los metadatos
 * colgados al pie en dos columnas. Aparece escalonada, una sola vez.
 */
export function EntryView({ entry, corpus, reduceMotion, compact, onOpenFigure }: Props) {
  // docs/MUSEO.md: la navegación va en los dos sentidos, y el vínculo solo
  // está escrito del lado de la figura.
  const figures = figuresOfEntry(entry.id, corpus.figures);
  const border = STATUS_BORDER[entry.epistemicStatus];
  const categories = entry.categories.map((id) => corpus.categories.find((c) => c.id === id)?.name ?? id);
  const contributors = entry.contributors.map((id) => corpus.contributors.find((c) => c.id === id)?.name ?? id);

  return (
    <View style={styles.column}>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <CatalogId id={entry.id} reduceMotion={reduceMotion} />
      </Reveal>

      <Reveal index={1} reduceMotion={reduceMotion}>
        <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
          {entry.title}
        </Text>
        {entry.sensitive ? <Text style={styles.sensitive}>contenido sensible, con fines educativos</Text> : null}
      </Reveal>

      <Reveal index={2} reduceMotion={reduceMotion}>
        <ContentBlock border={border} text={entry.content} statusLabel={STATUS_LABEL[entry.epistemicStatus]} />
      </Reveal>

      <Reveal index={3} reduceMotion={reduceMotion}>
        <Text style={[styles.question, compact && styles.questionCompact]}>{entry.question}</Text>
      </Reveal>

      <Reveal index={4} reduceMotion={reduceMotion}>
        <View style={styles.meta}>
          <MetaRow label="tipo" value={TYPE_LABEL[entry.type]} />
          <MetaRow label="categorías" value={categories.length > 0 ? categories.join(', ') : 'sin categoría todavía'} />
          <MetaRow label="estado" value={STATUS_LABEL[entry.epistemicStatus]} accent={border.accentLabel} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>fuentes</Text>
            <View style={styles.metaValues}>
              {entry.sources.length === 0 ? (
                <Text style={styles.metaValue}>ninguna todavía</Text>
              ) : (
                entry.sources.map((source) =>
                  source.url ? (
                    <Text
                      key={source.label}
                      style={[styles.metaValue, styles.link]}
                      accessibilityRole="link"
                      onPress={() => void Linking.openURL(source.url as string)}
                    >
                      {source.label}
                    </Text>
                  ) : (
                    <Text key={source.label} style={styles.metaValue}>
                      {source.label}
                    </Text>
                  ),
                )
              )}
            </View>
          </View>
          {figures.length > 0 ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>en el gabinete</Text>
              <View style={styles.metaValues}>
                {figures.map((figure) => (
                  <Pressable
                    key={figure.id}
                    accessibilityRole="link"
                    accessibilityLabel={figure.name}
                    accessibilityHint="abre la figura"
                    onPress={() => onOpenFigure(figure.id)}
                  >
                    <Text style={[styles.metaValue, styles.link]}>{figure.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <MetaRow label="aportada por" value={contributors.join(' y ')} />
          <MetaRow label="añadida" value={entry.addedAt} />
        </View>
      </Reveal>
    </View>
  );
}

function CatalogId({ id, reduceMotion }: { id: string; reduceMotion: boolean }) {
  const label = catalogId(id);
  const [shown, setShown] = useState(() => (reduceMotion ? label : label.replace(/\d/g, '0')));

  useEffect(() => {
    const match = /^(.*?)(\d+)$/.exec(label);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (!match || reduceMotion) {
        setShown(label);
        return;
      }
      const progress = Math.min(1, (now - start) / COUNTER_MS);
      setShown(`${match[1]}${String(Math.round(Number(match[2]) * progress)).padStart(match[2].length, '0')}`);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // El identificador es un dato, no un adorno: si el navegador no anima
    // —pestaña de fondo, ahorro de energía, una captura— el contador se
    // quedaba clavado en DELYRA 0000, que es un número de catálogo falso.
    // Este plazo lo deja en el suyo aunque no llegue ni un solo fotograma.
    const settle = setTimeout(() => setShown(label), COUNTER_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [label, reduceMotion]);

  return (
    <Text style={styles.catalog} accessibilityLabel={label}>
      {shown}
    </Text>
  );
}

function ContentBlock({ border, text, statusLabel }: { border: StatusBorder; text: string; statusLabel: string }) {
  const tone = border.tone === 'dim' ? colors.dim : colors.text;
  return (
    <View
      style={[
        styles.block,
        border.rule === 'solid' || border.rule === 'dashed' || border.rule === 'dotted'
          ? { borderLeftWidth: border.width, borderLeftColor: tone, borderStyle: border.rule }
          : null,
      ]}
      accessibilityLabel={`${statusLabel}. ${text}`}
    >
      {border.rule === 'double' ? (
        // Dos líneas de 1 px con 1 px entre ellas: el borde doble, dibujado igual en web y en nativo.
        <View style={[styles.double, { borderColor: tone }]} />
      ) : null}
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

function MetaRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, styles.metaValues, accent && styles.accent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Una columna de 640 px, alineada a la izquierda.
  column: { maxWidth: 640, width: '100%' },
  // El identificador es uno de los dos únicos usos del acento.
  catalog: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.serif,
    ...text.hero,
    color: colors.text,
    marginTop: space.md,
  },
  titleCompact: { ...text.display },
  sensitive: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: space.sm,
  },
  block: {
    marginTop: space.lg,
    paddingLeft: space.md,
  },
  double: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  body: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.text,
  },
  question: {
    fontFamily: fonts.serif,
    ...text.title,
    color: colors.dim,
    marginTop: space.xl,
  },
  questionCompact: { ...text.lead },
  meta: {
    marginTop: space.xl,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  metaRow: { flexDirection: 'row', marginBottom: space.xs },
  metaLabel: {
    width: 108,
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
  },
  metaValues: { flex: 1 },
  metaValue: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.text,
  },
  link: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  accent: { color: colors.accent },
});
