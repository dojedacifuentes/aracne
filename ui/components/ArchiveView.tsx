import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { facets, filterEntries, isEmpty, NO_FILTERS, toggle, type ArchiveFilters } from '../../lib/archive/filter';
import type { Corpus, LegState } from '../../lib/content/corpus';
import { catalogId, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import type { Entry, EntryType, EpistemicStatus } from '../../lib/schema';
import { useFocusRing } from '../hooks/useFocusRing';
import { useTouchHeight } from '../hooks/useTouch';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { Chip } from './Chip';
import { aracneNode } from './spiderEffect/marks';
import { ToolButton } from './ToolButton';

type Props = {
  corpus: Corpus;
  filters: ArchiveFilters;
  compact: boolean;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onChange: (next: ArchiveFilters) => void;
  onOpen: (id: string) => void;
};

type FiltersProps = {
  corpus: Corpus;
  legs: LegState[];
  filters: ArchiveFilters;
  onChange: (next: ArchiveFilters) => void;
};

/** Un tag que solo tiene una entrada es esa entrada: no es un filtro. */
const TAG_FLOOR = 2;

/** Cuántas filas se pintan de una vez. Con mil entradas esto importa. */
const PAGINA = 60;

/** El año de una entrada sale de sus fuentes; si ninguna lo trae, no hay año. */
function entryYear(entry: Entry): number | null {
  const years = entry.sources.map((source) => source.year).filter((year): year is number => typeof year === 'number');
  return years.length > 0 ? Math.min(...years) : null;
}

/**
 * Las invocaciones: el archivo entero, que es de donde sale todo lo que el
 * oráculo devuelve.
 *
 * Dos cosas cambian respecto al listado anterior. La primera: **los quince
 * tipos se ven**. El esquema admite concepto, obra, caso, fenómeno,
 * experimento, paradoja, pregunta, lugar, suceso, objeto, personaje, portal,
 * tecnología, teoría y anomalía, y el listado los enseñaba a todos con la
 * misma cara; ahora hay una regla de tipos arriba, con su cuenta, que además
 * filtra. La segunda: **los filtros no cobran columna**. Están detrás de un
 * control y se abren encima.
 *
 * Y se pinta por páginas: cuarenta y cuatro entradas caben de una vez, mil no.
 */
export function ArchiveView({
  corpus,
  filters,
  compact,
  filtersOpen,
  onToggleFilters,
  onChange,
  onOpen,
}: Props) {
  const [visibles, setVisibles] = useState(PAGINA);
  const results = useMemo(() => filterEntries(corpus.entries, filters), [corpus.entries, filters]);
  const tipos = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const entry of corpus.entries) cuenta.set(entry.type, (cuenta.get(entry.type) ?? 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [corpus.entries]);

  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name ?? id;
  const puestos =
    filters.categories.length +
    filters.types.length +
    filters.statuses.length +
    filters.tags.length +
    (filters.query.trim() ? 1 : 0);

  const mostradas = results.slice(0, visibles);

  return (
    <View>
      <View style={styles.barra}>
        <Text style={styles.cuenta}>
          {isEmpty(filters)
            ? `${results.length} entradas`
            : `${results.length} de ${corpus.entries.length} entradas`}
        </Text>
        <ToolButton
          label="filtros"
          count={puestos}
          expanded={filtersOpen}
          onPress={onToggleFilters}
          hint="patas, tipo, estado, tags y búsqueda"
        />
      </View>

      {/* La regla de tipos: lo que el archivo contiene, y no solo cuánto. */}
      <View style={styles.regla}>
        {tipos.map(([tipo, cuenta]) => {
          const on = filters.types.includes(tipo as EntryType);
          return (
            <TipoMarca
              key={tipo}
              label={TYPE_LABEL[tipo as EntryType]}
              count={cuenta}
              on={on}
              onPress={() => onChange({ ...filters, types: toggle(filters.types, tipo as EntryType) })}
            />
          );
        })}
      </View>

      {results.length === 0 ? (
        <Text style={styles.vacio}>ninguna entrada cumple estos filtros. quita alguno.</Text>
      ) : (
        <View style={styles.lista}>
          {mostradas.map((entry) => (
            <Row
              key={entry.id}
              entry={entry}
              compact={compact}
              categoryName={categoryName}
              onPress={() => onOpen(entry.id)}
            />
          ))}
        </View>
      )}

      {results.length > mostradas.length ? (
        <View style={styles.mas}>
          <ToolButton
            label={`ver ${Math.min(PAGINA, results.length - mostradas.length)} más`}
            onPress={() => setVisibles((n) => n + PAGINA)}
            hint={`quedan ${results.length - mostradas.length} entradas sin pintar`}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * El instrumento del archivo, para el cajón. Las cifras de cada faceta se
 * calculan sobre el archivo entero, no sobre lo que queda filtrado: un filtro
 * tiene que decir cuánto hay detrás antes de pulsarlo.
 */
export function ArchiveFilterPanel({ corpus, legs, filters, onChange }: FiltersProps) {
  const available = useMemo(() => facets(corpus.entries, legs), [corpus.entries, legs]);
  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name ?? id;
  const tags = available.tags.filter((tag) => tag.count >= TAG_FLOOR || filters.tags.includes(tag.id));

  return (
    <View>
      <TextInput
        value={filters.query}
        onChangeText={(query) => onChange({ ...filters, query })}
        placeholder="buscar"
        placeholderTextColor={colors.dim}
        style={styles.busca}
        autoCorrect={false}
        accessibilityLabel="buscar en el archivo"
        returnKeyType="search"
      />

      <Grupo label="patas">
        {available.categories.map((facet) => (
          <Chip
            key={facet.id}
            label={categoryName(facet.id)}
            count={facet.count}
            on={filters.categories.includes(facet.id)}
            onPress={() => onChange({ ...filters, categories: toggle(filters.categories, facet.id) })}
          />
        ))}
      </Grupo>

      <Grupo label="tipo">
        {available.types.map((facet) => (
          <Chip
            key={facet.id}
            label={TYPE_LABEL[facet.id as EntryType]}
            count={facet.count}
            on={filters.types.includes(facet.id as EntryType)}
            onPress={() => onChange({ ...filters, types: toggle(filters.types, facet.id as EntryType) })}
          />
        ))}
      </Grupo>

      <Grupo label="estado">
        {available.statuses.map((facet) => (
          <Chip
            key={facet.id}
            label={STATUS_LABEL[facet.id as EpistemicStatus]}
            count={facet.count}
            on={filters.statuses.includes(facet.id as EpistemicStatus)}
            onPress={() => onChange({ ...filters, statuses: toggle(filters.statuses, facet.id as EpistemicStatus) })}
          />
        ))}
      </Grupo>

      {tags.length > 0 ? (
        <Grupo label="tags">
          {tags.map((facet) => (
            <Chip
              key={facet.id}
              label={facet.id}
              count={facet.count}
              on={filters.tags.includes(facet.id)}
              onPress={() => onChange({ ...filters, tags: toggle(filters.tags, facet.id) })}
            />
          ))}
        </Grupo>
      ) : null}

      <View style={styles.mas}>
        <ToolButton
          label="quitar los filtros"
          onPress={() => onChange({ ...NO_FILTERS })}
          hint="deja el archivo entero a la vista"
        />
      </View>
    </View>
  );
}

function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.grupo}>
      <Text style={styles.grupoLabel}>{label}</Text>
      <View style={styles.fichas}>{children}</View>
    </View>
  );
}

/** Una marca de la regla de tipos: nombre, cuenta, y conmuta el filtro. */
function TipoMarca({
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
  const [hovered, setHovered] = useState(false);
  const alto = useTouchHeight();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`${count} entradas de este tipo`}
      accessibilityState={{ selected: on }}
      aria-pressed={on}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.tipo, { minHeight: alto }, on && styles.tipoOn, focusVisible && styles.focus]}
    >
      <Text style={[styles.tipoTexto, (on || hovered) && styles.tipoTextoOn]}>{label}</Text>
      <Text style={[styles.tipoCuenta, on && styles.tipoCuentaOn]}>{count}</Text>
    </Pressable>
  );
}

function Row({
  entry,
  compact,
  categoryName,
  onPress,
}: {
  entry: Entry;
  compact: boolean;
  categoryName: (id: string) => string;
  onPress: () => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  // CLAUDE.md: el estado epistémico siempre se ve cuando no es un hecho.
  const status = entry.epistemicStatus === 'fact' ? null : STATUS_LABEL[entry.epistemicStatus];
  const year = entryYear(entry);
  const datos = [
    TYPE_LABEL[entry.type],
    year === null ? null : String(year),
    ...entry.categories.map(categoryName),
    status,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      {...aracneNode(entry.id)}
      accessibilityRole="link"
      accessibilityLabel={entry.title}
      accessibilityHint={`${catalogId(entry.id)}. ${datos}. abre la entrada.`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.fila, focusVisible && styles.focus]}
    >
      <Text style={[styles.titulo, hovered && styles.subrayado]} numberOfLines={compact ? 2 : 1}>
        {entry.title}
      </Text>
      <Text style={styles.datos} numberOfLines={2}>
        <Text style={styles.catalogo}>{catalogId(entry.id)}</Text>
        {` · ${datos}`}
        {entry.related.length > 0 ? ` · ${entry.related.length} cruces` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.sm,
  },
  cuenta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.dim,
    textTransform: 'uppercase',
  },

  regla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    paddingBottom: space.sm,
    marginBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tipo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minHeight: 26,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    outlineWidth: 0,
  },
  tipoOn: { borderColor: machine },
  tipoTexto: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.9, color: colors.dim },
  tipoTextoOn: { color: colors.text },
  tipoCuenta: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.9, color: colors.line },
  tipoCuentaOn: { color: machine },

  // Dos resultados por fila donde quepan; lo decide el ancho, no un umbral.
  lista: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md },
  fila: {
    flexGrow: 1,
    flexBasis: 320,
    minHeight: HIT_SIZE,
    paddingVertical: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
  },
  titulo: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 27, color: colors.text },
  datos: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0.6,
    color: colors.dim,
  },
  // El identificador es uno de los dos únicos usos del acento.
  catalogo: { color: colors.accent },
  subrayado: { textDecorationLine: 'underline', textDecorationColor: colors.line },

  mas: { marginTop: space.md, flexDirection: 'row' },

  busca: {
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
  grupo: { marginTop: space.md },
  grupoLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },

  vacio: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
  },
  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
