import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { facets, filterEntries, isEmpty, NO_FILTERS, toggle, type ArchiveFilters } from '../../lib/archive/filter';
import type { Corpus, LegState } from '../../lib/content/corpus';
import { catalogId, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import type { Entry, EntryType, EpistemicStatus } from '../../lib/schema';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { Chip } from './Chip';

type Props = {
  corpus: Corpus;
  filters: ArchiveFilters;
  onOpen: (id: string) => void;
};

type AsideProps = {
  corpus: Corpus;
  legs: LegState[];
  filters: ArchiveFilters;
  onChange: (next: ArchiveFilters) => void;
};

/** Un tag que solo tiene una entrada es esa entrada: no es un filtro. */
const TAG_FLOOR = 2;

/**
 * El archivo entero: lo que queda tras los filtros, y nada más.
 *
 * Los filtros viven en la columna de la derecha (`ArchiveAside`), que es la
 * que corresponde a esta sección. Estaban aquí arriba, y con cuarenta y cuatro
 * entradas eso significaba que el primer scroll se los llevaba: para quitar
 * una faceta había que volver a subir.
 *
 * Aquí no se invoca nada: esta pantalla es lo contrario del oráculo. El
 * oráculo sirve para encontrar lo que no buscabas; esto, para volver a algo
 * que ya sabes que está.
 */
export function ArchiveView({ corpus, filters, onOpen }: Props) {
  const results = useMemo(() => filterEntries(corpus.entries, filters), [corpus.entries, filters]);

  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name ?? id;

  return (
    <View>
      <Text style={styles.count}>
        {isEmpty(filters)
          ? `${results.length} entradas`
          : `${results.length} de ${corpus.entries.length} entradas`}
      </Text>

      {results.length === 0 ? (
        <Text style={styles.empty}>ninguna entrada cumple estos filtros. quita alguno.</Text>
      ) : (
        <View style={styles.results}>
          {results.map((entry) => (
            <Row key={entry.id} entry={entry} categoryName={categoryName} onPress={() => onOpen(entry.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * El instrumento del archivo: la búsqueda y las facetas.
 *
 * Las cifras de cada faceta se calculan sobre el archivo entero, no sobre lo
 * que queda filtrado: un filtro tiene que decir cuánto hay detrás antes de
 * pulsarlo. Los tags de una sola entrada no aparecen, porque un tag que solo
 * tiene una entrada *es* esa entrada.
 */
export function ArchiveAside({ corpus, legs, filters, onChange }: AsideProps) {
  const available = useMemo(() => facets(corpus.entries, legs), [corpus.entries, legs]);

  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name ?? id;

  const tags = available.tags.filter(
    (tag) => tag.count >= TAG_FLOOR || filters.tags.includes(tag.id),
  );

  const puestos =
    filters.categories.length + filters.types.length + filters.statuses.length + filters.tags.length;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.label}>las facetas</Text>
        <Text style={[styles.state, puestos > 0 && styles.stateOn]}>
          {puestos > 0 ? `${puestos} puestas` : 'ninguna'}
        </Text>
      </View>

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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="quitar los filtros"
        accessibilityHint="deja el archivo entero a la vista"
        disabled={isEmpty(filters)}
        onPress={() => onChange({ ...NO_FILTERS })}
        style={[styles.clear, isEmpty(filters) && styles.clearOff]}
      >
        <Text style={styles.clearText}>quitar los filtros</Text>
      </Pressable>
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
      accessibilityHint={`${catalogId(entry.id)}. ${meta}${status ? `. ${status}` : ''}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.row, focusVisible && styles.focus]}
    >
      <Text style={[styles.title, hovered && styles.underline]}>{entry.title}</Text>
      {/* Identificador y datos en la misma línea. Eran dos, y dos líneas por
          cuarenta y cuatro entradas es media pantalla de más. No se quita
          nada: el estado epistémico sigue aquí, que es lo que manda. */}
      <Text style={styles.meta}>
        <Text style={styles.catalog}>{catalogId(entry.id)}</Text>
        {` · ${meta}`}
        {status ? ` · ${status}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // La cabecera del panel, con la misma gramática que las patas.
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
  state: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.dim },
  stateOn: { color: machine },

  // El fondo es el del lienzo, no el de la columna: la columna ya es
  // `surface`, y una caja del mismo color que su panel no se ve.
  search: {
    minHeight: HIT_SIZE,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text,
    outlineWidth: 0,
  },

  group: { marginTop: space.md },
  groupLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },

  clear: {
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  clearOff: { opacity: 0.35 },
  clearText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: colors.dim, textTransform: 'uppercase' },

  count: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    paddingBottom: space.sm,
  },
  empty: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
  },

  /*
   * Cuantos resultados quepan por fila, sin un punto de ruptura escrito: lo
   * decide el ancho que haya. La base es 320 y no menos, **y eso es
   * compactación aunque parezca lo contrario**: medido, con tres columnas de
   * 267 px los títulos envolvían a dos líneas y la sección salía más alta que
   * con dos columnas anchas. Estrechar la caja no ahorra pantalla: la alarga.
   */
  results: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md },
  row: {
    flexGrow: 1,
    flexBasis: 320,
    minHeight: HIT_SIZE,
    paddingVertical: space.xs,
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
