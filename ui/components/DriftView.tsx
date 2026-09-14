import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RING } from '../../lib/aleph/tension';
import type { Corpus } from '../../lib/content/corpus';
import { buildDrift } from '../../lib/drift/graph';
import { contact, twoWorlds, type DriftMode } from '../../lib/drift/modes';
import { catalogId } from '../../lib/labels';
import { useFocusRing } from '../hooks/useFocusRing';
import { linkText } from '../lib/copy';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Tela } from './Tela';

type Props = {
  corpus: Corpus;
  seed: string;
  mode: DriftMode;
  /** Pata desde la que se pide la antípoda, en el modo dos mundos. */
  leg: string | null;
  size: number;
  onOpen: (id: string) => void;
  onMode: (mode: DriftMode) => void;
};

const LARGO = 5;

/**
 * La red, leída de tres maneras.
 *
 * `deriva` sigue una cadena y nombra la razón de cada paso. `dos mundos` pide
 * la antípoda de una pata y, como el anillo es impar, devuelve las dos que
 * flanquean el hueco sin resolver el desajuste. `contacto` busca el camino más
 * corto entre lo que aportó cada uno, y si no lo hay lo dice.
 *
 * Los tres dibujan la misma tela arriba: lo que cambia es qué se enciende.
 */
export function DriftView({ corpus, seed, mode, leg, size, onOpen, onMode }: Props) {
  const entries = corpus.entries;

  const drift = useMemo(() => {
    if (mode !== 'deriva' || entries.length === 0) return [];
    // La semilla elige el punto de partida: la misma URL empieza igual.
    const index = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % entries.length;
    return buildDrift(entries[index], entries, LARGO, seed);
  }, [mode, entries, seed]);

  const worlds = useMemo(() => {
    if (mode !== 'dos-mundos') return null;
    const from = corpus.categories.find((c) => c.id === leg) ?? corpus.categories[0];
    return from ? twoWorlds(from, corpus.categories, RING) : null;
  }, [mode, leg, corpus.categories]);

  const touch = useMemo(
    () => (mode === 'contacto' ? contact(entries, 'diego', 'paola', seed) : null),
    [mode, entries, seed],
  );

  const lit =
    mode === 'deriva'
      ? drift.map((s) => s.entry.id)
      : mode === 'contacto'
        ? (touch?.path ?? []).map((s) => s.entry.id)
        : entries
            .filter((e) =>
              worlds ? e.categories.some((c) => c === worlds.facing[0].id || c === worlds.facing[1].id) : false,
            )
            .map((e) => e.id);

  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name;

  return (
    <View>
      <Text style={styles.section}>la red</Text>
      <Tela corpus={corpus} seed={seed} size={size} lit={lit} onOpen={onOpen} />

      <View style={styles.modes}>
        {(['deriva', 'dos-mundos', 'contacto'] as DriftMode[]).map((m) => (
          <ModeButton key={m} label={m === 'dos-mundos' ? 'dos mundos' : m} on={m === mode} onPress={() => onMode(m)} />
        ))}
      </View>

      {mode === 'deriva' ? (
        <View style={styles.block}>
          {drift.length <= 1 ? (
            <Text style={styles.note}>esta entrada no tiene vecinos: la deriva termina aquí.</Text>
          ) : null}
          {drift.map((step) => (
            <View key={step.entry.id} style={styles.step}>
              {step.link ? <Text style={styles.why}>por {linkText(step.link, categoryName)}</Text> : null}
              <Line id={step.entry.id} title={step.entry.title} onPress={() => onOpen(step.entry.id)} />
            </View>
          ))}
          {drift.length > 1 ? (
            <Text style={styles.tags}>
              tags que atravesó: {[...new Set(drift.flatMap((s) => s.entry.tags))].sort().join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {mode === 'dos-mundos' && worlds ? (
        <View style={styles.block}>
          <Text style={styles.lead}>
            Enfrente de {worlds.from.name} no hay ninguna pata. El anillo es impar, así que hay un hueco, y el
            hueco lo flanquean {worlds.facing[0].name} y {worlds.facing[1].name}.
          </Text>
          <Text style={styles.note}>
            El archivo no resuelve el cruce. Lo deja apoyado en las dos y deja la pregunta abierta.
          </Text>
        </View>
      ) : null}

      {mode === 'contacto' && touch ? (
        <View style={styles.block}>
          {touch.path ? (
            <>
              <Text style={styles.lead}>
                {touch.path.length - 1} {touch.path.length === 2 ? 'paso' : 'pasos'} entre lo que aportó Diego y lo
                que aportó Paola.
              </Text>
              {touch.path.map((step) => (
                <View key={step.entry.id} style={styles.step}>
                  {step.link ? <Text style={styles.why}>por {linkText(step.link, categoryName)}</Text> : null}
                  <Line id={step.entry.id} title={step.entry.title} onPress={() => onOpen(step.entry.id)} />
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.note}>sin ruta todavía.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function ModeButton({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.mode, on && styles.modeOn, focusVisible && styles.focus]}
    >
      <Text style={[styles.modeText, on && styles.modeTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Line({ id, title, onPress }: { id: string; title: string; onPress: () => void }) {
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
      style={[styles.line, focusVisible && styles.focus]}
    >
      <Text style={styles.catalog}>{catalogId(id)}</Text>
      <Text style={[styles.title, hovered && styles.underline]}>{title}</Text>
    </Pressable>
  );
}

const MONO = { fontSize: 12, letterSpacing: 0.72, lineHeight: 18 } as const;

const styles = StyleSheet.create({
  section: { fontFamily: fonts.mono, ...MONO, color: colors.dim, marginBottom: space.sm },
  modes: { flexDirection: 'row', gap: space.xs, marginTop: space.md },
  mode: {
    paddingVertical: 6,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  modeOn: { borderColor: colors.text },
  modeText: { fontFamily: fonts.mono, ...MONO, color: colors.dim },
  modeTextOn: { color: colors.text },

  block: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  step: { marginBottom: space.xs },
  why: { fontFamily: fonts.mono, ...MONO, color: colors.dim },
  line: { minHeight: HIT_SIZE - 8, justifyContent: 'center', outlineWidth: 0 },
  catalog: { fontFamily: fonts.mono, ...MONO, color: colors.accent },
  title: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: colors.text },
  lead: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, color: colors.text, marginBottom: space.sm },
  note: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, color: colors.dim },
  tags: { fontFamily: fonts.mono, ...MONO, color: colors.dim, marginTop: space.sm },
  underline: { textDecorationLine: 'underline', textDecorationColor: colors.line },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
