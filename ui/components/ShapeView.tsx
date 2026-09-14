import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shapeOf, type Slice } from '../../lib/archive/shape';
import type { Corpus, LegState } from '../../lib/content/corpus';
import { STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import type { EntryType, EpistemicStatus } from '../../lib/schema';
import { colors, fonts, space } from '../theme';

type Props = {
  corpus: Corpus;
  legs: LegState[];
};

const MONO = { fontSize: 12, letterSpacing: 0.72, lineHeight: 18 } as const;

/**
 * La forma del archivo.
 *
 * Buscar obliga a preguntar y esconde el resto; esto enseña cuánto hay y cómo
 * está repartido, para poder mirar sin saber qué se busca. Barras de una sola
 * línea, sin librería de gráficos y sin un segundo color: la longitud dice la
 * proporción y el número dice el dato exacto.
 */
export function ShapeView({ corpus, legs }: Props) {
  const shape = useMemo(() => shapeOf(corpus.entries, legs), [corpus.entries, legs]);
  const name = (id: string) => corpus.categories.find((c) => c.id === id)?.name ?? id;

  return (
    <View>
      <Text style={styles.section}>la forma del archivo</Text>
      <Text style={styles.lead}>
        {shape.entries} entradas en {shape.lit} patas encendidas
        {shape.retracted > 0 ? ` y ${shape.retracted} en reserva` : ''}.{' '}
        {shape.pending > 0
          ? `${shape.pending} esperan verificación.`
          : 'ninguna espera verificación.'}
      </Text>

      <Group label="patas">
        {shape.legs.map((s) => (
          <Bar key={s.id} label={name(s.id)} slice={s} max={shape.legs[0]?.count ?? 1} />
        ))}
      </Group>

      <Group label="tipo">
        {shape.types.map((s) => (
          <Bar
            key={s.id}
            label={TYPE_LABEL[s.id as EntryType] ?? s.id}
            slice={s}
            max={shape.types[0]?.count ?? 1}
          />
        ))}
      </Group>

      <Group label="estado">
        {shape.statuses.map((s) => (
          <Bar
            key={s.id}
            label={STATUS_LABEL[s.id as EpistemicStatus] ?? s.id}
            slice={s}
            max={shape.statuses[0]?.count ?? 1}
          />
        ))}
      </Group>

      <Group label="medias">
        <Text style={styles.plain}>
          extrañeza {shape.averages.strangeness} · oscuridad {shape.averages.darkness} · ficción{' '}
          {shape.averages.fictionality}
        </Text>
      </Group>

      {shape.tags.length > 0 ? (
        <Group label="tags en más de una entrada">
          <Text style={styles.plain}>
            {shape.tags.map((t) => `${t.id} ${t.count}`).join(' · ')}
          </Text>
        </Group>
      ) : null}
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Una barra: longitud proporcional, número exacto al lado. Sin color. */
function Bar({ label, slice, max }: { label: string; slice: Slice; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((slice.count / max) * 100)) : 0;
  return (
    <View
      style={styles.row}
      accessibilityLabel={`${label}: ${slice.count} entradas, ${Math.round(slice.share * 100)} por ciento`}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${width}%` }]} />
      </View>
      <Text style={styles.rowCount}>{slice.count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.mono, ...MONO, color: colors.dim, marginBottom: space.sm },
  lead: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    marginBottom: space.md,
  },
  group: { marginTop: space.md },
  groupLabel: { fontFamily: fonts.mono, ...MONO, color: colors.dim, marginBottom: space.xs },
  plain: { fontFamily: fonts.mono, ...MONO, color: colors.text },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  rowLabel: { width: 180, fontFamily: fonts.mono, ...MONO, color: colors.text },
  // La pista no se dibuja: solo la barra. Una caja vacía sería otra línea más.
  track: { flex: 1, height: 6, justifyContent: 'center' },
  fill: { height: 2, backgroundColor: colors.dim },
  rowCount: { width: 28, textAlign: 'right', fontFamily: fonts.mono, ...MONO, color: colors.dim },
});
