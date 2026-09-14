import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ArchiveFilters } from '../../lib/archive/filter';
import { usableLegs } from '../../lib/content/corpus';
import { loadArchive } from '../../lib/content/loader';
import { pressSeed } from '../../lib/oracle';
import { pushHistory } from '../../lib/oracle/history';
import { entriesOfRoom, roomStates } from '../../lib/museum/rooms';
import type { DriftMode, WebSkin } from '../../lib/drift/modes';
import { invoke } from '../../lib/oracle/invoke';
import { freshSeed } from '../../lib/oracle/rng';
import { ArchiveView } from '../components/ArchiveView';
import { RoomsView, RoomView } from '../components/CabinetView';
import { CommandPalette, type Command } from '../components/CommandPalette';
import { DriftView } from '../components/DriftView';
import { ShapeView } from '../components/ShapeView';
import { Tejido } from '../components/Tejido';
import { EntryView } from '../components/EntryView';
import { FigureView } from '../components/FigureView';
import { InvocationView } from '../components/InvocationView';
import { LegButton } from '../components/LegButton';
import { LegRing } from '../components/LegRing';
import { PurposeView } from '../components/PurposeView';
import { Spider } from '../components/spider/Spider';
import { TextButton } from '../components/TextButton';
import { useRoute } from '../hooks/useRoute';
import { getLayoutMode, MAX_CONTENT_WIDTH } from '../lib/layout';
import { ARCHIVE, CABINET, HOME, SHAPE, WEB } from '../lib/route';
import { readHistory, rememberEntries } from '../lib/storedHistory';
import { colors, fonts, space } from '../theme';

type Props = {
  reduceMotion: boolean;
};

/** Qué ocupa el panel cuando no hay invocación: las patas o su propósito. */
type Panel = 'patas' | 'proposito';

const NONE: readonly string[] = [];

/**
 * Lo único que hay que saber para empezar. No es un tour ni una promesa: dice
 * qué se puede tocar, que es el problema real de una interfaz callada.
 */
const LEAD = 'apoya las patas que quieras y pulsa la araña. lo que salga no lo estabas buscando.';

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
  // El escenario: cuadrado, sin pasarse de alto, y con sitio para el anillo.
  const stageWeb = Math.min(Math.round(width * 0.38), height - 120);
  // La tela, cuando tiene la pantalla para ella sola.
  const webSize = Math.min(Math.round(width - space.lg * 4), height - 240, 720);

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
  const openWeb = useCallback(() => navigate(WEB), [navigate]);
  const weave = useCallback(
    (id: string | null) => {
      if (route.name !== 'web') return;
      navigate({ ...route, focus: id });
    },
    [route, navigate],
  );
  const setSkin = useCallback(
    (skin: WebSkin) => {
      if (route.name !== 'web') return;
      navigate({ ...route, skin });
    },
    [route, navigate],
  );
  /** Desde la tela se salta a un mapa con una semilla nueva. */
  const openMap = useCallback(
    (mode: DriftMode) => {
      presses.current += 1;
      navigate({ name: 'drift', seed: freshSeed(Date.now(), presses.current), mode, leg: selected[0] ?? null });
    },
    [selected, navigate],
  );
  const openShape = useCallback(() => navigate(SHAPE), [navigate]);

  /** La red se abre con la semilla de la invocación en curso, o con una nueva. */
  const openDrift = useCallback(() => {
    presses.current += 1;
    const seed = route.name === 'invocation' ? route.seed : freshSeed(Date.now(), presses.current);
    navigate({ name: 'drift', seed, mode: 'deriva', leg: selected[0] ?? null });
  }, [route, selected, navigate]);

  const setDriftMode = useCallback(
    (mode: DriftMode) => {
      if (route.name !== 'drift') return;
      navigate({ ...route, mode });
    },
    [route, navigate],
  );
  const setFilters = useCallback(
    (filters: ArchiveFilters) => navigate({ name: 'archive', filters }),
    [navigate],
  );

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
  const isReading = route.name !== 'invocation' && route.name !== 'home';
  const panelShare = isReading ? 0.78 : 0.5;

  /** La tela pide la pantalla entera: ahí el escenario se retira. */
  const wide = route.name === 'web';

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
      position={portrait ? [0.5, 0.58] : [0.5, 0.5]}
      onPress={press}
      label="invocar"
      style={StyleSheet.absoluteFill}
    />
  );

  const legRow = () =>
    legs.map((leg) => (
      <LegButton
        key={leg.category.id}
        leg={leg.category.leg}
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
    ) : route.name === 'drift' ? (
      <DriftView
        corpus={corpus}
        seed={route.seed}
        mode={route.mode}
        leg={route.leg}
        // El cuadro nunca es mayor que la columna que lo contiene.
        size={Math.min(portrait ? width - space.md * 2 : 380, 420)}
        onOpen={openEntry}
        onMode={setDriftMode}
      />
    ) : route.name === 'web' ? (
      <Tejido
        corpus={corpus}
        focus={route.focus}
        skin={route.skin}
        size={portrait ? Math.min(width - space.md * 2, 420) : webSize}
        onFocus={weave}
        onSkin={setSkin}
        onOpen={openEntry}
        onMap={openMap}
      />
    ) : route.name === 'shape' ? (
      <ShapeView corpus={corpus} legs={legs} />
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
        <TextButton label="la red" onPress={openDrift} hint="ver esta invocación sobre la tela" />
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
    ) : route.name === 'web' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'drift' || route.name === 'shape' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="la tela" onPress={openWeb} hint="la red entera, y los mapas que la leen" />
        <TextButton label="gabinete" onPress={openCabinet} />
        <TextButton label="archivo" onPress={openArchive} />
        <TextButton label={panel === 'proposito' ? 'patas' : 'propósito'} onPress={togglePanel} />
        <TextButton label="la forma" onPress={openShape} />
      </View>
    );

  if (!portrait) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <View style={styles.columns}>
          {/* El escenario: la tela al fondo y la araña encima. Las dos son
              ambiente, no contenido, así que no ocupan altura de lectura. */}
          {/* La tela ya no vive aquí: tiene su propia pantalla. El
              escenario es del animal y de sus once patas, que es lo único
              que hay que entender para empezar. */}
          {wide ? null : (
            <View style={styles.stageWide}>
              {/* La araña y el anillo comparten caja cuadrada: si no, el
                  centro del anillo y el cuerpo del animal no coinciden y los
                  hilos apuntan a cualquier parte. */}
              <View style={{ width: stageWeb, height: stageWeb }}>
                {spider}
                <LegRing
                  legs={legs}
                  selected={active}
                  size={stageWeb}
                  center={{ x: 0.5, y: 0.5 }}
                  onToggle={toggle}
                />
              </View>
            </View>
          )}
          <View style={[styles.side, wide && styles.sideWide, { paddingTop: insets.top + space.lg }]}>
            {header}
            <ScrollView
              style={styles.sideScroll}
              contentContainerStyle={styles.sideContent}
              showsVerticalScrollIndicator={false}
            >
              {reading ?? <Text style={styles.lead}>{LEAD}</Text>}
            </ScrollView>
            {buttons}
          </View>
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
          </ScrollView>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legRow}>
              {legRow()}
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
  },
  stageWide: { flex: 0.85, justifyContent: 'center', alignItems: 'center' },
  side: {
    flex: 1.15,
    maxWidth: 680,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  sideWide: { flex: 1, maxWidth: MAX_CONTENT_WIDTH },
  sideScroll: { flex: 1, marginTop: space.md },
  lead: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 30,
    color: colors.dim,
    maxWidth: 420,
  },
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


  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  missing: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
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
