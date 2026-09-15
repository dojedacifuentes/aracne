import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fold } from '../../lib/archive/filter';
import type { Corpus, Figure } from '../../lib/content/corpus';
import { byChronology, centuries, century, centuryLabel } from '../../lib/museum/authors';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { AuthorSprite } from './AuthorSprite';
import { Chip } from './Chip';
import { ToolButton } from './ToolButton';

type Props = {
  corpus: Corpus;
  /** Tema por el que se filtra, o null. Viaja en la URL: `/autores/<tema>`. */
  theme: string | null;
  compact: boolean;
  onOpenFigure: (id: string) => void;
  onTheme: (id: string | null) => void;
};

/**
 * Los autores, en una sola cronología.
 *
 * Eran nueve temas en el menú global, al mismo nivel que el Atlas o la tela, y
 * para llegar a una vida había que acertar antes con el problema en el que se
 * había metido. El criterio de los temas es bueno —agrupan problemas, no
 * siglos ni escuelas— pero es un **filtro**, no una puerta: la puerta es el
 * tiempo, que cualquiera sabe leer.
 *
 * Así que aquí están los cuarenta y cuatro seguidos, de 1632 a hoy, con su
 * sprite, y los temas quedan como uno de los tres filtros. La lista está
 * pensada para crecer: las cabeceras de siglo son las únicas marcas de
 * estructura y se calculan del dato, no se escriben.
 */
export function AuthorsView({ corpus, theme, compact, onOpenFigure, onTheme }: Props) {
  const [filtros, setFiltros] = useState(false);
  const [siglo, setSiglo] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  const temaActual = theme ? (corpus.themes.find((t) => t.id === theme) ?? null) : null;
  const siglosDisponibles = useMemo(() => centuries(corpus.figures), [corpus.figures]);

  const lista = useMemo(() => {
    const q = fold(busca.trim());
    return byChronology(corpus.figures).filter((figure) => {
      if (temaActual && figure.theme !== temaActual.id) return false;
      if (siglo !== null && century(figure) !== siglo) return false;
      if (!q) return true;
      return fold(`${figure.name} ${figure.years} ${figure.emblem} ${figure.idea}`).includes(q);
    });
  }, [corpus.figures, temaActual, siglo, busca]);

  const puestos = (temaActual ? 1 : 0) + (siglo !== null ? 1 : 0) + (busca.trim() ? 1 : 0);

  return (
    <View>
      <View style={styles.barra}>
        <Text style={styles.cuenta}>
          {lista.length === corpus.figures.length
            ? `${lista.length} autores`
            : `${lista.length} de ${corpus.figures.length} autores`}
        </Text>
        <ToolButton
          label="filtros"
          count={puestos}
          expanded={filtros}
          onPress={() => setFiltros((abierto) => !abierto)}
          hint="tema, siglo y búsqueda"
        />
      </View>

      {temaActual && !filtros ? (
        <Text style={styles.criterio}>
          <Text style={styles.criterioTema}>{temaActual.name}. </Text>
          {temaActual.criterion}
        </Text>
      ) : null}

      {filtros ? (
        <View style={styles.panel}>
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="buscar un autor"
            placeholderTextColor={colors.dim}
            style={styles.busca}
            autoCorrect={false}
            accessibilityLabel="buscar un autor"
            returnKeyType="search"
          />

          <Text style={styles.grupo}>temas · el problema en el que se metió</Text>
          <View style={styles.fichas}>
            {corpus.themes.map((t) => (
              <Chip
                key={t.id}
                label={t.name.toLowerCase()}
                count={corpus.figures.filter((f) => f.theme === t.id).length}
                on={temaActual?.id === t.id}
                onPress={() => onTheme(temaActual?.id === t.id ? null : t.id)}
              />
            ))}
          </View>

          <Text style={styles.grupo}>siglo de nacimiento</Text>
          <View style={styles.fichas}>
            {siglosDisponibles.map((value) => (
              <Chip
                key={value}
                label={centuryLabel(value)}
                count={corpus.figures.filter((f) => century(f) === value).length}
                on={siglo === value}
                onPress={() => setSiglo(siglo === value ? null : value)}
              />
            ))}
          </View>

          {temaActual ? <Text style={styles.criterio}>{temaActual.criterion}</Text> : null}
        </View>
      ) : null}

      {lista.length === 0 ? (
        <Text style={styles.vacio}>ningún autor cumple estos filtros. quita alguno.</Text>
      ) : (
        <Cronologia lista={lista} corpus={corpus} compact={compact} onOpenFigure={onOpenFigure} />
      )}
    </View>
  );
}

/** La lista, cortada por siglos. La cabecera es una coordenada, no un adorno. */
function Cronologia({
  lista,
  corpus,
  compact,
  onOpenFigure,
}: {
  lista: readonly Figure[];
  corpus: Corpus;
  compact: boolean;
  onOpenFigure: (id: string) => void;
}) {
  const piezas: React.ReactNode[] = [];
  let ultimo: number | null | undefined;

  for (const figure of lista) {
    const actual = century(figure);
    if (actual !== ultimo) {
      ultimo = actual;
      piezas.push(
        <Text key={`siglo-${actual ?? 'sin'}`} style={styles.siglo}>
          {actual === null ? 'sin año reconocible' : centuryLabel(actual)}
        </Text>,
      );
    }
    piezas.push(
      <AuthorRow
        key={figure.id}
        figure={figure}
        theme={corpus.themes.find((t) => t.id === figure.theme)?.name ?? ''}
        compact={compact}
        onPress={() => onOpenFigure(figure.id)}
      />,
    );
  }

  return <View>{piezas}</View>;
}

/**
 * Una vida en la cronología: el año manda la fila, el sprite la identifica y
 * el emblema dice en una línea de qué va. Las cifras de la derecha —cuántas
 * entradas reclama y si tiene obra abierta— son las conexiones que pedía el
 * encargo, y solo suben de tono al pasar por encima.
 */
function AuthorRow({
  figure,
  theme,
  compact,
  onPress,
}: {
  figure: Figure;
  theme: string;
  compact: boolean;
  onPress: () => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const activo = hovered || focusVisible;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={figure.name}
      accessibilityHint={`${figure.years}. ${figure.entries.length} entradas ligadas. abre su ficha.`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.fila, activo && styles.filaActiva, focusVisible && styles.focus]}
    >
      <Text style={[styles.anios, activo && styles.aniosActivo]}>{figure.years}</Text>
      <AuthorSprite id={figure.id} emblem={figure.emblem} size={compact ? 34 : 40} />
      <View style={styles.texto}>
        <Text style={[styles.nombre, activo && styles.nombreActivo]} numberOfLines={1}>
          {figure.name}
        </Text>
        <Text style={styles.emblema} numberOfLines={1}>
          {figure.emblem}
          {theme ? ` · ${theme.toLowerCase()}` : ''}
        </Text>
      </View>
      <View style={styles.marcas}>
        <Text style={[styles.marca, figure.entries.length > 0 && activo && styles.marcaViva]}>
          {String(figure.entries.length).padStart(2, '0')}
        </Text>
        <Text style={[styles.marca, figure.works.length > 0 && activo && styles.marcaViva]}>
          {figure.works.length > 0 ? 'obra' : '—'}
        </Text>
      </View>
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

  panel: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: space.sm,
    marginBottom: space.sm,
  },
  busca: {
    minHeight: HIT_SIZE - 6,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text,
    outlineWidth: 0,
  },
  grupo: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  criterio: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 25,
    color: colors.dim,
    maxWidth: 720,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  criterioTema: { color: colors.text },

  siglo: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.line,
    textTransform: 'uppercase',
    marginTop: space.md,
    marginBottom: space.xs,
  },

  fila: {
    minHeight: HIT_SIZE + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingRight: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
  },
  filaActiva: { backgroundColor: colors.surface },
  // La columna de años es el espinazo de la cronología: ancho fijo, en mono.
  anios: {
    width: 92,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.dim,
  },
  aniosActivo: { color: machine },
  texto: { flex: 1, minWidth: 0 },
  nombre: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: colors.dim },
  nombreActivo: { color: colors.text },
  emblema: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    lineHeight: 16,
    color: colors.line,
  },
  marcas: { alignItems: 'flex-end' },
  marca: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, lineHeight: 15, color: colors.line },
  marcaViva: { color: machine },

  vacio: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
  },
  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
