import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Corpus } from '../../lib/content/corpus';
import { neighbours } from '../../lib/drift/graph';
import { catalogId } from '../../lib/labels';
import type { Entry } from '../../lib/schema';
import { useFocusRing } from '../hooks/useFocusRing';
import { linkText } from '../lib/copy';
import { colors, fonts, HIT_SIZE, space, text } from '../theme';

type Props = {
  corpus: Corpus;
  /** La entrada que se está mirando, si hay alguna. */
  entry: Entry | null;
  /** Los identificadores por los que se ha pasado, del más reciente al más viejo. */
  history: readonly string[];
  onOpen: (id: string) => void;
};

/** Más de esto es el archivo, no una columna de contexto. */
const MAX = 7;

/**
 * Lo que hay al lado.
 *
 * `lib/drift/graph.ts` ya sabía puntuar el vínculo entre dos entradas y decir
 * por qué existe; hasta ahora eso solo se veía cuando una invocación salía en
 * forma de deriva, es decir por azar. Aquí está siempre: mirando una entrada
 * se ven sus vecinas y **la razón de cada vínculo**, que es lo que permite
 * seguir un hilo en vez de volver a tirar el dado.
 *
 * La razón se nombra con `linkText`, la misma que usa la deriva: un vínculo no
 * puede llamarse de dos maneras según dónde se lea.
 */
export function Context({ corpus, entry, history, onOpen }: Props) {
  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name;

  if (entry) {
    const links = neighbours(entry, corpus.entries).slice(0, MAX);
    return (
      <View style={styles.column}>
        <Text style={styles.label}>vínculos</Text>
        {links.length === 0 ? (
          <Text style={styles.empty}>esta entrada no toca ninguna otra todavía.</Text>
        ) : (
          links.map((link) => {
            const other = corpus.entries.find((e) => e.id === link.to);
            if (!other) return null;
            return (
              <Row
                key={link.to}
                title={other.title}
                meta={`por ${linkText(link, categoryName)}`}
                id={other.id}
                onPress={() => onOpen(other.id)}
              />
            );
          })
        )}
      </View>
    );
  }

  const seen = history
    .map((id) => corpus.entries.find((e) => e.id === id))
    .filter((e): e is Entry => e !== undefined)
    .slice(0, MAX);

  return (
    <View style={styles.column}>
      <Text style={styles.label}>por dónde has pasado</Text>
      {seen.length === 0 ? (
        <Text style={styles.empty}>todavía nada. pulsa la araña.</Text>
      ) : (
        seen.map((item) => (
          <Row key={item.id} title={item.title} meta={catalogId(item.id)} id={item.id} onPress={() => onOpen(item.id)} />
        ))
      )}
    </View>
  );
}

function Row({
  title,
  meta,
  id,
  onPress,
}: {
  title: string;
  meta: string;
  id: string;
  onPress: () => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      accessibilityHint={`${meta}. abre la entrada`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.row, focusVisible && styles.focus]}
      key={id}
    >
      <Text style={[styles.title, hovered && styles.underline]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {meta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { width: 232 },
  label: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  row: {
    minHeight: HIT_SIZE,
    justifyContent: 'center',
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    outlineWidth: 0,
  },
  title: {
    fontFamily: fonts.serif,
    ...text.small,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: 2,
  },
  empty: {
    fontFamily: fonts.serif,
    ...text.small,
    color: colors.dim,
    marginTop: space.xs,
  },
  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
