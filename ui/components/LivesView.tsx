import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Figure } from '../../lib/content/corpus';
import type { ThemeState } from '../../lib/museum/themes';
import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Emblem } from './Emblem';
import { Reveal } from './Reveal';

type LivesProps = {
  themes: ThemeState[];
  reduceMotion: boolean;
  onOpenTheme: (id: string) => void;
};

/**
 * Las biografías, por temas.
 *
 * Antes eran siete salas que agrupaban por circunstancia —quién se quedó
 * ciego, quién tuvo un empleo administrativo—. Eso decía cosas de sus vidas y
 * ninguna de sus ideas. Ahora el criterio es el problema en el que cada uno se
 * metió, y por eso una figura está en un tema y en uno solo: la sección se lee
 * en orden, de arriba abajo, como un índice y no como una rejilla.
 *
 * El criterio va siempre junto al nombre, sin desplegar: **el criterio es el
 * contenido**, y la lista de quién está dentro vale mucho menos que la razón
 * por la que está.
 */
export function LivesView({ themes, reduceMotion, onOpenTheme }: LivesProps) {
  const total = themes.reduce((sum, state) => sum + state.figures.length, 0);

  return (
    <View>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <Text style={styles.section}>biografías</Text>
        <Text style={styles.lead}>
          {total} vidas en {themes.length} temas. ninguna se representa por su cara: cada una tiene un objeto. de
          cada una se cuenta una idea poco citada, un hecho comprobable y, cuando la hay, una obra que se puede
          abrir.
        </Text>
      </Reveal>
      {themes.map((state, index) => (
        <Reveal key={state.theme.id} index={index + 1} reduceMotion={reduceMotion}>
          <ThemeRow state={state} onPress={() => onOpenTheme(state.theme.id)} />
        </Reveal>
      ))}
    </View>
  );
}

function ThemeRow({ state, onPress }: { state: ThemeState; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const count = state.figures.length;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={state.theme.name}
      accessibilityHint={`${count} biografías. ${state.theme.criterion}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.theme, focusVisible && styles.focus]}
    >
      <Text style={[styles.themeName, hovered && styles.underline]}>{state.theme.name}</Text>
      <Text style={styles.criterion}>{state.theme.criterion}</Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'biografía' : 'biografías'}
        {state.entries.length > 0 ? ` · ${state.entries.length} entradas ligadas` : ' · sin entradas ligadas'}
      </Text>
      <Text style={styles.roster} numberOfLines={2}>
        {state.figures.map((figure) => figure.name).join(' · ')}
      </Text>
    </Pressable>
  );
}

type ThemeProps = {
  state: ThemeState;
  reduceMotion: boolean;
  onOpenFigure: (id: string) => void;
};

/** Un tema: su criterio arriba, y debajo las vidas que lo comparten. */
export function ThemeView({ state, reduceMotion, onOpenFigure }: ThemeProps) {
  return (
    <View>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <Text style={styles.section}>tema</Text>
        <Text style={styles.title} accessibilityRole="header">
          {state.theme.name}
        </Text>
        <Text style={styles.criterionLarge}>{state.theme.criterion}</Text>
      </Reveal>
      {state.figures.map((figure, index) => (
        <Reveal key={figure.id} index={index + 1} reduceMotion={reduceMotion}>
          <FigureRow figure={figure} onPress={() => onOpenFigure(figure.id)} />
        </Reveal>
      ))}
    </View>
  );
}

/**
 * Una vida en la lista: el emblema, el nombre, los años y el principio de su
 * idea. Va a una columna y no a dos: lo que se lee aquí es prosa, y estrechar
 * la caja no ahorra pantalla, la alarga.
 */
export function FigureRow({ figure, onPress }: { figure: Figure; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={figure.name}
      accessibilityHint={`${figure.years}. ${figure.emblem}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.figure, focusVisible && styles.focus]}
    >
      <Emblem id={figure.id} emblem={figure.emblem} size={48} />
      <View style={styles.figureText}>
        <Text style={[styles.figureName, hovered && styles.underline]}>{figure.name}</Text>
        <Text style={styles.years}>
          {figure.years} · {figure.emblem}
          {figure.works.length > 0 ? ' · con obra' : ''}
        </Text>
        <Text style={styles.idea} numberOfLines={2}>
          {figure.idea}
        </Text>
      </View>
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
  lead: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
    marginBottom: space.lg,
    maxWidth: 640,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
  },
  criterionLarge: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
    marginTop: space.sm,
    marginBottom: space.lg,
    maxWidth: 640,
  },

  theme: {
    minHeight: HIT_SIZE,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
    maxWidth: 640,
  },
  themeName: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 29,
    color: colors.text,
  },
  criterion: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.dim,
    marginTop: 2,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: space.xs,
  },
  roster: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.dim,
    marginTop: 2,
  },

  figure: {
    minHeight: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    outlineWidth: 0,
    maxWidth: 640,
  },
  figureText: { flex: 1, marginLeft: space.md },
  figureName: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 27,
    color: colors.text,
  },
  years: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: 2,
  },
  idea: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    color: colors.dim,
    marginTop: space.xs,
  },

  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  // El foco es uno de los dos únicos usos del acento.
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
