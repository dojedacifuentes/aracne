import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { usableLegs } from '../../lib/content/corpus';
import { loadArchive } from '../../lib/content/loader';
import { pressSeed } from '../../lib/oracle';
import { pushHistory } from '../../lib/oracle/history';
import { invoke } from '../../lib/oracle/invoke';
import { InvocationView } from '../components/InvocationView';
import { LegButton } from '../components/LegButton';
import { PurposeView } from '../components/PurposeView';
import { Spider } from '../components/spider/Spider';
import { TextButton } from '../components/TextButton';
import { useRoute } from '../hooks/useRoute';
import { getLayoutMode, MAX_CONTENT_WIDTH } from '../lib/layout';
import { HOME } from '../lib/route';
import { readHistory, rememberEntries } from '../lib/storedHistory';
import { colors, fonts, space } from '../theme';

type Props = {
  reduceMotion: boolean;
};

/** Qué ocupa el panel cuando no hay invocación: las patas o su propósito. */
type Panel = 'patas' | 'proposito';

const NONE: readonly string[] = [];

/**
 * La portada. Una sola escena, como en el tarot: nunca se navega a otra
 * pantalla. La araña cuelga a un lado y el panel del otro muestra las patas,
 * su propósito o lo que salió al pulsar. En móvil, la araña arriba y el panel
 * debajo.
 */
export function HomeScreen({ reduceMotion }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const portrait = getLayoutMode(width, height) === 'mobilePortrait';
  const { corpus, legs } = loadArchive();
  const [route, navigate] = useRoute();
  const [selected, setSelected] = useState<readonly string[]>(NONE);
  const [panel, setPanel] = useState<Panel>('patas');
  const [history, setHistory] = useState<readonly string[]>(NONE);
  const presses = useRef(0);

  useEffect(() => {
    let alive = true;
    void readHistory().then((stored) => {
      if (alive) setHistory(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  // La invocación sale de la URL, nunca del historial: la misma URL da lo mismo en cualquier parte.
  const invocationLegs = useMemo(
    () => (route.name === 'invocation' ? usableLegs(route.legs, legs) : null),
    [route, legs],
  );
  const invocation = useMemo(
    () => (route.name === 'invocation' && invocationLegs ? invoke(corpus.entries, route.seed, invocationLegs) : null),
    [route, invocationLegs, corpus.entries],
  );

  // Una URL compartida trae sus patas: la araña cuelga igual que para quien la envió.
  const active = invocationLegs ?? selected;
  const spiderLegs = useMemo(
    () => legs.filter((leg) => active.includes(leg.category.id)).map((leg) => leg.category.leg),
    [legs, active],
  );

  const toggle = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }, []);

  const press = useCallback(() => {
    const patas = usableLegs(active, legs);
    presses.current += 1;
    const { seed, invocation: next } = pressSeed(corpus.entries, patas, Date.now(), presses.current, history);
    setSelected(patas);
    navigate({ name: 'invocation', seed, legs: patas });
    if (!next) return;
    const ids = next.entries.map((entry) => entry.id);
    setHistory((current) => pushHistory(current, ids));
    void rememberEntries(ids);
  }, [active, legs, corpus.entries, history, navigate]);

  const back = useCallback(() => {
    setSelected(active);
    setPanel('patas');
    navigate(HOME);
  }, [active, navigate]);

  const togglePanel = useCallback(() => {
    setPanel((current) => (current === 'proposito' ? 'patas' : 'proposito'));
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
      legs={spiderLegs}
      reduceMotion={reduceMotion}
      position={portrait ? [0.5, 0.58] : [0.5, 0.52]}
      onPress={press}
      label="invocar"
      style={StyleSheet.absoluteFill}
    />
  );

  const legButtons = (compact: boolean) =>
    legs.map((leg) => (
      <LegButton
        key={leg.category.id}
        compact={compact}
        glyph={leg.category.glyph}
        name={leg.category.name}
        count={leg.count}
        lit={leg.visible}
        missing={leg.missing}
        selected={selected.includes(leg.category.id)}
        onPress={() => toggle(leg.category.id)}
      />
    ));

  const reading =
    route.name === 'invocation' ? (
      <InvocationView
        key={`${route.seed}|${route.legs.join(',')}`}
        invocation={invocation}
        corpus={corpus}
        seed={route.seed}
        reduceMotion={reduceMotion}
        compact={portrait}
      />
    ) : panel === 'proposito' ? (
      <PurposeView legs={legs} selected={selected} reduceMotion={reduceMotion} />
    ) : null;

  const buttons =
    route.name === 'invocation' ? (
      <View style={styles.buttons}>
        <TextButton label="otra" onPress={press} hint="otra invocación con las mismas patas" />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label={panel === 'proposito' ? 'patas' : 'propósito'} onPress={togglePanel} />
      </View>
    );

  if (!portrait) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <View style={styles.columns}>
          <View style={styles.stageWide}>{spider}</View>
          <View style={[styles.side, { paddingTop: insets.top + space.lg }]}>
            {header}
            <ScrollView
              style={styles.sideScroll}
              contentContainerStyle={styles.sideContent}
              showsVerticalScrollIndicator={false}
            >
              {reading ?? <View>{legButtons(false)}</View>}
            </ScrollView>
            {buttons}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <View style={styles.stagePortrait}>
        {spider}
        <View style={[styles.headerOverlay, { top: insets.top + space.md }]}>{header}</View>
      </View>
      <View style={styles.panel}>
        {reading ? (
          <ScrollView
            style={{ maxHeight: Math.round(height * 0.5) }}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            {reading}
          </ScrollView>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legRow}>
              {legButtons(true)}
            </ScrollView>
            <Text style={styles.latest} numberOfLines={1}>
              {latest ? latest.category.name : 'apoya una pata'}
            </Text>
          </>
        )}
        <View style={styles.panelButtons}>{buttons}</View>
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
    maxWidth: 480,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  sideScroll: { flex: 1, marginTop: space.md },
  sideContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.md },

  stagePortrait: { flex: 1 },
  headerOverlay: { position: 'absolute', left: space.md, right: space.md, pointerEvents: 'box-none' },
  panel: { paddingBottom: space.md },
  panelContent: { paddingHorizontal: space.md, paddingTop: space.sm },
  panelButtons: { paddingHorizontal: space.md },
  legRow: { paddingHorizontal: space.sm },
  latest: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text,
    paddingHorizontal: space.md,
    marginTop: space.xs,
  },

  buttons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },

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
