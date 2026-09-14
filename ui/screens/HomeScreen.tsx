import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadArchive } from '../../lib/content/loader';
import { LegButton } from '../components/LegButton';
import { Spider } from '../components/spider/Spider';
import { getLayoutMode, MAX_CONTENT_WIDTH } from '../lib/layout';
import { colors, fonts, space } from '../theme';

type Props = {
  reduceMotion: boolean;
};

/**
 * La portada. Una sola escena, como en el tarot: nunca se navega a otra
 * pantalla. La araña cuelga a un lado y sus patas esperan al otro; en móvil,
 * la araña arriba y las patas en una fila de glifos debajo.
 */
export function HomeScreen({ reduceMotion }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const portrait = getLayoutMode(width, height) === 'mobilePortrait';
  const { corpus, legs } = loadArchive();
  const [selected, setSelected] = useState<readonly string[]>([]);

  const selectedLegs = useMemo(
    () => legs.filter((leg) => selected.includes(leg.category.id)).map((leg) => leg.category.leg),
    [legs, selected],
  );

  const toggle = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }, []);

  const lit = legs.filter((leg) => leg.visible).length;
  const latest = legs.find((leg) => leg.category.id === selected[selected.length - 1]);

  const header = (
    <View>
      <Text style={styles.name} accessibilityRole="header">
        aracne
      </Text>
      <Text style={styles.meta}>
        {corpus.entries.length} entradas · {lit} de {legs.length} patas
      </Text>
    </View>
  );

  const spider = (
    <Spider
      ringSize={legs.length}
      legs={selectedLegs}
      reduceMotion={reduceMotion}
      position={portrait ? [0.5, 0.6] : [0.5, 0.52]}
      style={StyleSheet.absoluteFill}
    />
  );

  if (!portrait) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <View style={styles.columns}>
          <View style={styles.stageWide}>{spider}</View>
          <View style={[styles.side, { paddingTop: insets.top + space.lg }]}>
            {header}
            <View style={styles.legList}>
              {legs.map((leg) => (
                <LegButton
                  key={leg.category.id}
                  glyph={leg.category.glyph}
                  name={leg.category.name}
                  count={leg.count}
                  lit={leg.visible}
                  missing={leg.missing}
                  selected={selected.includes(leg.category.id)}
                  onPress={() => toggle(leg.category.id)}
                />
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <View style={styles.stagePortrait}>
        {spider}
        <View style={[styles.headerOverlay, { top: insets.top + space.md }]}>
          {header}
        </View>
      </View>
      <View style={styles.legBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legRow}
        >
          {legs.map((leg) => (
            <LegButton
              key={leg.category.id}
              compact
              glyph={leg.category.glyph}
              name={leg.category.name}
              count={leg.count}
              lit={leg.visible}
              missing={leg.missing}
              selected={selected.includes(leg.category.id)}
              onPress={() => toggle(leg.category.id)}
            />
          ))}
        </ScrollView>
        <Text style={styles.latest} numberOfLines={1}>
          {latest ? latest.category.name : 'apoya una pata'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  columns: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  stageWide: { flex: 1.1 },
  side: {
    flex: 1,
    maxWidth: 460,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  legList: { marginTop: space.lg },

  stagePortrait: { flex: 1 },
  headerOverlay: { position: 'absolute', left: space.md, right: space.md, pointerEvents: 'box-none' },
  legBar: { paddingBottom: space.md },
  legRow: { paddingHorizontal: space.sm },
  latest: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text,
    paddingHorizontal: space.md,
    marginTop: space.xs,
  },

  name: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: space.xs,
  },
});
