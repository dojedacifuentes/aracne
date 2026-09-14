import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { facets, filterEntries, isEmpty, toggle, type ArchiveFilters } from '../../lib/archive/filter';
import type { Corpus, LegState } from '../../lib/content/corpus';
import { catalogId, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import type { Entry, EntryType, EpistemicStatus } from '../../lib/schema';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space } from '../theme';

type Props = {
  corpus: Corpus;
  legs: LegState[];
  filters: ArchiveFilters;
  onChange: (next: ArchiveFilters) => void;
  onOpen: (id: string) => void;
};

/** Un tag que solo tiene una entrada es esa entrada: no es un filtro. */
const TAG_FLOOR = 2;

/**
 * El archivo entero. Filtros combinables por pata, tipo, estado, quién y tag,
 * y búsqueda local sobre todo lo que una entrada dice, fuentes incluidas.
 *
 * Aquí no se invoca nada: esta pantalla es lo contrario del oráculo. El
 * oráculo sirve para encontrar lo que no buscabas; esto, para volver a algo
 * que ya sabes que está.
 */
export function ArchiveView({ corpus, legs, filters, onChange, onOpen }: Props) {
  const available = useMemo(() => facets(corpus.entries, legs), [corpus.entries, legs]);
  const results = useMemo(() => filterEntries(corpus.entries, filters), [corpus.entries, filters]);

  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name ?? id;

  const tags = available.tags.filter(
    (tag) => tag.count >= TAG_FLOOR || filters.tags.includes(tag.id),
  );

  return (
    <View>
      <Text style={styles.section}>el archivo</Text>

      <TextInput
        value={filters.query}
        onChangeText={(query) => onChange({ ...filters, query })}
        placeholder="buscar"
        placeholderTextColor={colors.dim}
        style={styles.search}
        autoCorrect={false}
        accessibilityLabel="buscar en el archivo"
        returnKeyType="search"
      />

      <Group label="patas">
        {available.categories.map((facet) => (
          <Chip
            key={facet.id}
            label={categoryName(facet.id)}
            count={facet.count}
            on={filters.categories.includes(facet.id)}
            onPress={() => onChange({ ...filters, categories: toggle(filters.categories, facet.id) })}
          />
        ))}
      </Group>

      <Group label="tipo">
        {available.types.map((facet) => (
          <Chip
            key={facet.id}
            label={TYPE_LABEL[facet.id as EntryType]}
            count={facet.count}
            on={filters.types.includes(facet.id as EntryType)}
            onPress={() => onChange({ ...filters, types: toggle(filters.types, facet.id as EntryType) })}
          />
        ))}
      </Group>

      <Group label="estado">
        {available.statuses.map((facet) => (
          <Chip
            key={facet.id}
            label={STATUS_LABEL[facet.id as EpistemicStatus]}
            count={facet.count}
            on={filters.statuses.includes(facet.id as EpistemicStatus)}
            onPress={() =>
              onChange({ ...filters, statuses: toggle(filters.statuses, facet.id as EpistemicStatus) })
            }
          />
        ))}
      </Group>

      {tags.length > 0 ? (
        <Group label="tags">
          {tags.map((facet) => (
            <Chip
              key={facet.id}
              label={facet.id}
              count={facet.count}
              on={filters.tags.includes(facet.id)}
              onPress={() => onChange({ ...filters, tags: toggle(filters.tags, facet.id) })}
            />
          ))}
        </Group>
      ) : null}

      <Text style={styles.count}>
        {isEmpty(filters)
          ? `${results.length} entradas`
          : `${results.length} de ${corpus.entries.length} entradas`}
      </Text>

      {results.length === 0 ? (
        <Text style={styles.empty}>ninguna entrada cumple estos filtros. quita alguno.</Text>
      ) : (
        results.map((entry) => (
          <Row key={entry.id} entry={entry} categoryName={categoryName} onPress={() => onOpen(entry.id)} />
        ))
      )}
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  count,
  on,
  onPress,
}: {
  label: string;
  count: number;
  on: boolean;
  onPress: () => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`${count} entradas`}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.chip, on && styles.chipOn, focusVisible && styles.focus]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]} maxFontSizeMultiplier={1.4}>
        {label} {count}
      </Text>
    </Pressable>
  );
}

function Row({
  entry,
  categoryName,
  onPress,
}: {
  entry: Entry;
  categoryName: (id: string) => string;
  onPress: () => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  // CLAUDE.md: el estado epistémico siempre se ve cuando no es un hecho.
  const status = entry.epistemicStatus === 'fact' ? null : STATUS_LABEL[entry.epistemicStatus];
  const meta = [TYPE_LABEL[entry.type], ...entry.categories.map(categoryName)].join(' · ');

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={entry.title}
      accessibilityHint="abre la entrada"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.row, focusVisible && styles.focus]}
    >
      <Text style={styles.catalog}>{catalogId(entry.id)}</Text>
      <Text style={[styles.title, hovered && styles.underline]}>{entry.title}</Text>
      <Text style={styles.meta}>
        {meta}
        {status ? ` · ${status}` : ''}
      </Text>
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
  search: {
    minHeight: HIT_SIZE,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text,
    outlineWidth: 0,
  },

  group: { marginTop: space.md },
  groupLabel: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginBottom: space.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  // Seleccionado no cambia de color: cambia el borde, como el botón.
  chipOn: { borderColor: colors.text },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
  },
  chipTextOn: { color: colors.text },

  count: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: space.lg,
    paddingBottom: space.sm,
  },
  empty: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
  },

  row: {
    minHeight: HIT_SIZE,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
  },
  // El identificador es uno de los dos únicos usos del acento.
  catalog: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 27,
    color: colors.text,
    marginTop: 2,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: 2,
  },

  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
