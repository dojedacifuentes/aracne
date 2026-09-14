import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ArchiveFilters } from '../../lib/archive/filter';
import { usableLegs } from '../../lib/content/corpus';
import { loadArchive } from '../../lib/content/loader';
import { pressSeed } from '../../lib/oracle';
import { pushHistory } from '../../lib/oracle/history';
import { entriesOfRoom, roomStates } from '../../lib/museum/rooms';
import { invoke } from '../../lib/oracle/invoke';
import { ArchiveView } from '../components/ArchiveView';
import { RoomsView, RoomView } from '../components/CabinetView';
import { CommandPalette, type Command } from '../components/CommandPalette';
import { Context } from '../components/Context';
import { EntryView } from '../components/EntryView';
import { FigureView } from '../components/FigureView';
import { InvocationView } from '../components/InvocationView';
import { LegButton } from '../components/LegButton';
import { Rail, type Place } from '../components/Rail';
import { PurposeView } from '../components/PurposeView';
import { Spider } from '../components/spider/Spider';
import { TextButton } from '../components/TextButton';
import { useRoute } from '../hooks/useRoute';
import { getLayoutMode, MAX_CONTENT_WIDTH } from '../lib/layout';
import { ARCHIVE, CABINET, HOME } from '../lib/route';
import { readHistory, rememberEntries } from '../lib/storedHistory';
import { colors, fonts, space, text } from '../theme';

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
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    let alive = true;
    void readHistory().then((stored) => {
      if (alive) setHistory(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Las salas salen de las figuras: rooms.json no lista a nadie.
  const rooms = useMemo(() => roomStates(corpus.figures, corpus.rooms), [corpus.figures, corpus.rooms]);
  const roomState = useMemo(
    () => (route.name === 'room' ? (rooms.find((r) => r.room.id === route.id) ?? null) : null),
    [route, rooms],
  );
  const figure = useMemo(
    () => (route.name === 'figure' ? (corpus.figures.find((f) => f.id === route.id) ?? null) : null),
    [route, corpus.figures],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // La invocación sale de la URL, nunca del historial: la misma URL da lo mismo en cualquier parte.
  const invocationLegs = useMemo(
    () => (route.name === 'invocation' ? usableLegs(route.legs, legs) : null),
    [route, legs],
  );
  /**
   * Invocar desde una sala no añade una categoría: recorta el corpus a las
   * entradas ligadas a sus figuras y se lo pasa al motor. El motor no sabe que
   * el gabinete existe.
   */
  const pool = useMemo(() => {
    if (route.name !== 'invocation' || !route.room) return corpus.entries;
    const state = rooms.find((r) => r.room.id === route.room);
    return state ? entriesOfRoom(state, corpus.entries) : corpus.entries;
  }, [route, rooms, corpus.entries]);

  const invocation = useMemo(
    () => (route.name === 'invocation' && invocationLegs ? invoke(pool, route.seed, invocationLegs) : null),
    [route, invocationLegs, pool],
  );

  const entry = useMemo(
    () => (route.name === 'entry' ? (corpus.entries.find((e) => e.id === route.id) ?? null) : null),
    [route, corpus.entries],
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

  const pressWith = useCallback(
    (room?: string) => {
      const patas = usableLegs(active, legs);
      const state = room ? rooms.find((r) => r.room.id === room) : undefined;
      const from = state ? entriesOfRoom(state, corpus.entries) : corpus.entries;
      presses.current += 1;
      const { seed, invocation: next } = pressSeed(from, patas, Date.now(), presses.current, history);
      setSelected(patas);
      navigate(state ? { name: 'invocation', seed, legs: patas, room } : { name: 'invocation', seed, legs: patas });
      if (!next) return;
      const ids = next.entries.map((item) => item.id);
      setHistory((current) => pushHistory(current, ids));
      void rememberEntries(ids);
    },
    [active, legs, rooms, corpus.entries, history, navigate],
  );

  const press = useCallback(() => pressWith(), [pressWith]);

  const openEntry = useCallback(
    (id: string) => {
      navigate({ name: 'entry', id });
    },
    [navigate],
  );

  const openRoom = useCallback((id: string) => navigate({ name: 'room', id }), [navigate]);
  const openFigure = useCallback((id: string) => navigate({ name: 'figure', id }), [navigate]);
  const openCabinet = useCallback(() => navigate(CABINET), [navigate]);

  const openArchive = useCallback(() => navigate(ARCHIVE), [navigate]);
  const setFilters = useCallback(
    (filters: ArchiveFilters) => navigate({ name: 'archive', filters }),
    [navigate],
  );

  /** El sitio en el que se está, para marcarlo en el carril. */
  const here: Place | null =
    route.name === 'archive'
      ? 'archivo'
      : route.name === 'cabinet' || route.name === 'room' || route.name === 'figure'
        ? 'gabinete'
        : route.name === 'invocation'
          ? 'invocar'
          : panel === 'proposito'
            ? 'propósito'
            : null;

  const go = useCallback(
    (place: Place) => {
      if (place === 'invocar') return press();
      if (place === 'archivo') return navigate(ARCHIVE);
      if (place === 'gabinete') return navigate(CABINET);
      setPanel('proposito');
      navigate(HOME);
    },
    [press, navigate],
  );

  /**
   * La entrada que manda en la columna de contexto: la que se está leyendo, o
   * la primera de la invocación. Sin ella, el contexto enseña por dónde has
   * pasado.
   */
  const focus = entry ?? invocation?.entries[0] ?? null;

  const run = useCallback(
    (command: Command) => {
      setPalette(false);
      switch (command.kind) {
        case 'invoke':
          return press();
        case 'archive':
          return navigate(ARCHIVE);
        case 'entry':
          return navigate({ name: 'entry', id: command.id });
        case 'room':
          return navigate({ name: 'room', id: command.id });
        case 'leg':
          // Saltar a una pata es apoyarla y volver a la araña, no invocar:
          // la decisión de pulsar sigue siendo de quien mira.
          setSelected((current) => (current.includes(command.id) ? current : [...current, command.id]));
          return navigate(HOME);
      }
    },
    [press, navigate],
  );

  const back = useCallback(() => {
    setSelected(active);
    setPanel('patas');
    navigate(HOME);
  }, [active, navigate]);

  const togglePanel = useCallback(() => {
    setPanel((current) => (current === 'proposito' ? 'patas' : 'proposito'));
  }, []);

  /**
   * En vertical, la araña y el panel se reparten la pantalla. Leyendo una
   * ficha, el gabinete o el archivo no se está consultando al oráculo: manda
   * el texto y la araña se queda en una franja. En una invocación no, porque
   * ahí la araña es parte del resultado.
   */
  // La columna de contexto pide sitio: por debajo de esto estorba más que ayuda.
  const wide3 = width >= 1180;
  const isReading = route.name !== 'invocation' && route.name !== 'home';
  const panelShare = isReading ? 0.78 : 0.5;

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
        onOpen={openEntry}
        pool={pool}
      />
    ) : route.name === 'entry' ? (
      entry ? (
        <EntryView
          key={entry.id}
          entry={entry}
          corpus={corpus}
          reduceMotion={reduceMotion}
          compact={portrait}
          onOpenFigure={openFigure}
        />
      ) : (
        <Text style={styles.missing}>no hay ninguna entrada con ese identificador. vuelve y pulsa.</Text>
      )
    ) : route.name === 'cabinet' ? (
      <RoomsView rooms={rooms} reduceMotion={reduceMotion} onOpenRoom={openRoom} />
    ) : route.name === 'room' ? (
      roomState ? (
        <RoomView state={roomState} reduceMotion={reduceMotion} onOpenFigure={openFigure} />
      ) : (
        <Text style={styles.missing}>no hay ninguna sala con ese nombre. vuelve al gabinete.</Text>
      )
    ) : route.name === 'figure' ? (
      figure ? (
        <FigureView
          key={figure.id}
          figure={figure}
          corpus={corpus}
          reduceMotion={reduceMotion}
          onOpenEntry={openEntry}
          onOpenRoom={openRoom}
        />
      ) : (
        <Text style={styles.missing}>no hay ninguna figura con ese nombre. vuelve al gabinete.</Text>
      )
    ) : route.name === 'archive' ? (
      <ArchiveView
        corpus={corpus}
        legs={legs}
        filters={route.filters}
        onChange={setFilters}
        onOpen={openEntry}
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
    ) : route.name === 'entry' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} hint="una invocación nueva con las patas apoyadas" />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'cabinet' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'room' ? (
      <View style={styles.buttons}>
        {roomState && roomState.entries.length > 0 ? (
          <TextButton
            label="invocar desde esta sala"
            onPress={() => pressWith(roomState.room.id)}
            hint={`solo las ${roomState.entries.length} entradas ligadas a esta sala`}
          />
        ) : null}
        <TextButton label="gabinete" onPress={openCabinet} />
      </View>
    ) : route.name === 'figure' ? (
      <View style={styles.buttons}>
        <TextButton label="gabinete" onPress={openCabinet} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'archive' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label={panel === 'proposito' ? 'patas' : 'propósito'} onPress={togglePanel} />
        <TextButton label="gabinete" onPress={openCabinet} />
        <TextButton label="archivo" onPress={openArchive} />
      </View>
    );

  const rail = (
    <Rail legs={legs} selected={selected} onToggle={toggle} onGo={go} here={here} />
  );
  const context = <Context corpus={corpus} entry={focus} history={history} onOpen={openEntry} />;

  if (!portrait) {
    // Tres columnas: el anillo, lo que se lee y lo que hay al lado. La araña se
    // queda arriba del centro —alta en la portada, en una franja mientras se
    // lee— para que nunca deje de estar ni tape el texto.
    return (
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <View style={[styles.columns, { paddingTop: insets.top + space.md }]}>
          <ScrollView style={styles.railColumn} showsVerticalScrollIndicator={false}>
            {header}
            <View style={styles.railInner}>{rail}</View>
          </ScrollView>

          <View style={styles.centre}>
            <View style={isReading ? styles.stageShort : styles.stageTall}>{spider}</View>
            <ScrollView
              style={styles.sideScroll}
              contentContainerStyle={styles.sideContent}
              showsVerticalScrollIndicator={false}
            >
              {reading}
            </ScrollView>
            {buttons}
          </View>

          {wide3 ? (
            <ScrollView style={styles.contextColumn} showsVerticalScrollIndicator={false}>
              {context}
            </ScrollView>
          ) : null}
        </View>
        {palette ? (
          <CommandPalette corpus={corpus} legs={legs} onRun={run} onClose={() => setPalette(false)} />
        ) : null}
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
            style={{ maxHeight: Math.round(height * panelShare) }}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            {reading}
            <View style={styles.contextBelow}>{context}</View>
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
        {palette ? (
          <CommandPalette corpus={corpus} legs={legs} onRun={run} onClose={() => setPalette(false)} />
        ) : null}
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
    gap: space.lg,
  },
  railColumn: { width: 232, paddingLeft: space.md },
  railInner: { marginTop: space.lg },
  centre: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.lg },
  contextColumn: { width: 232, paddingRight: space.md },
  contextBelow: { marginTop: space.lg },
  // La araña manda en la portada y se retira a una franja mientras se lee.
  stageTall: { flex: 1, minHeight: 260 },
  stageShort: { height: 148 },
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
    ...text.body,
    color: colors.text,
    paddingHorizontal: space.md,
    marginTop: space.xs,
  },

  // Cuatro botones no caben en 375 px: la fila envuelve antes que salirse.
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  missing: {
    fontFamily: fonts.serif,
    ...text.body,
    color: colors.dim,
  },

  name: {
    fontFamily: fonts.serif,
    ...text.display,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.mono,
    ...text.data,
    color: colors.dim,
    marginTop: space.xs,
  },
});
