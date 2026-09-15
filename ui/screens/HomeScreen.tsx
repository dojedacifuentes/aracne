import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ArchiveFilters } from '../../lib/archive/filter';
import { usableLegs } from '../../lib/content/corpus';
import { loadAtlas } from '../../lib/atlas/loader';
import { loadArchive } from '../../lib/content/loader';
import { pressSeed } from '../../lib/oracle';
import { pushHistory } from '../../lib/oracle/history';
import { entriesOfTheme, themeStates } from '../../lib/museum/themes';
import type { DriftMode, WebSkin } from '../../lib/drift/modes';
import { invoke } from '../../lib/oracle/invoke';
import { freshSeed } from '../../lib/oracle/rng';
import { ArchiveView } from '../components/ArchiveView';
import { AtlasView } from '../components/AtlasView';
import { LivesView, ThemeView } from '../components/LivesView';
import { CommandPalette, type Command } from '../components/CommandPalette';
import { DriftView } from '../components/DriftView';
import { ShapeView } from '../components/ShapeView';
import { Tejido } from '../components/Tejido';
import { EntryView } from '../components/EntryView';
import { FigureView } from '../components/FigureView';
import { InvocationView } from '../components/InvocationView';
import { LegPanel } from '../components/LegPanel';
import { ASIDE_WIDTH, NAV_WIDTH, Shell, type ShellGroup } from '../components/Shell';
import { PurposeView } from '../components/PurposeView';
import { Spider } from '../components/spider/Spider';
import { TextButton } from '../components/TextButton';
import { useRoute } from '../hooks/useRoute';
import { canvasSize, getLayoutMode } from '../lib/layout';
import { ARCHIVE, ATLAS, HOME, LIVES, SHAPE, WEB } from '../lib/route';
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
  const portrait = getLayoutMode(width, height) === 'mobilePortrait';
  const { corpus, legs } = loadArchive();
  const [route, navigate] = useRoute();
  const [selected, setSelected] = useState<readonly string[]>(NONE);
  const [panel, setPanel] = useState<Panel>('patas');
  const [history, setHistory] = useState<readonly string[]>(NONE);
  const presses = useRef(0);
  const [palette, setPalette] = useState(false);
  /**
   * El ancho de la columna central. Todo lo que se dibuja va medido con esto
   * y no con el de la ventana: la araña se calculaba con la ventana entera y
   * se salía por encima del menú de la izquierda.
   */
  const centro = portrait
    ? width - space.md * 2
    : Math.max(360, width - NAV_WIDTH - ASIDE_WIDTH - space.lg * 2);
  const stageWeb = canvasSize(Math.round(centro * 0.74), height - 300, 460);
  const webSize = canvasSize(centro, height - 260, 720);

  useEffect(() => {
    let alive = true;
    void readHistory().then((stored) => {
      if (alive) setHistory(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Los temas salen de las figuras: themes.json no lista a nadie.
  const themes = useMemo(() => themeStates(corpus.figures, corpus.themes), [corpus.figures, corpus.themes]);
  const themeState = useMemo(
    () => (route.name === 'theme' ? (themes.find((t) => t.theme.id === route.id) ?? null) : null),
    [route, themes],
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
   * Invocar desde un tema no añade una categoría: recorta el corpus a las
   * entradas ligadas a sus figuras y se lo pasa al motor. El motor no sabe que
   * las biografías existen.
   */
  const pool = useMemo(() => {
    if (route.name !== 'invocation' || !route.room) return corpus.entries;
    const state = themes.find((t) => t.theme.id === route.room);
    return state ? entriesOfTheme(state, corpus.entries) : corpus.entries;
  }, [route, themes, corpus.entries]);

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
      const state = room ? themes.find((t) => t.theme.id === room) : undefined;
      const from = state ? entriesOfTheme(state, corpus.entries) : corpus.entries;
      presses.current += 1;
      const { seed, invocation: next } = pressSeed(from, patas, Date.now(), presses.current, history);
      setSelected(patas);
      navigate(state ? { name: 'invocation', seed, legs: patas, room } : { name: 'invocation', seed, legs: patas });
      if (!next) return;
      const ids = next.entries.map((item) => item.id);
      setHistory((current) => pushHistory(current, ids));
      void rememberEntries(ids);
    },
    [active, legs, themes, corpus.entries, history, navigate],
  );

  const press = useCallback(() => pressWith(), [pressWith]);

  const openEntry = useCallback(
    (id: string) => {
      navigate({ name: 'entry', id });
    },
    [navigate],
  );

  const openTheme = useCallback((id: string) => navigate({ name: 'theme', id }), [navigate]);
  const openFigure = useCallback((id: string) => navigate({ name: 'figure', id }), [navigate]);
  const openLives = useCallback(() => navigate(LIVES), [navigate]);

  const openArchive = useCallback(() => navigate(ARCHIVE), [navigate]);
  const openWeb = useCallback(() => navigate(WEB), [navigate]);
  const openAtlas = useCallback(() => navigate(ATLAS), [navigate]);
  /** Desde una entrada se salta al Atlas con esa causa ya puesta. */
  const openCause = useCallback(
    (id: string) => navigate({ name: 'atlas', country: null, lens: id }),
    [navigate],
  );
  /** En el Atlas, el país y la lente viajan en la URL como todo lo demás. */
  const setAtlasCountry = useCallback(
    (id: string | null) => {
      if (route.name !== 'atlas') return;
      navigate({ ...route, country: id });
    },
    [route, navigate],
  );
  const setAtlasLens = useCallback(
    (id: string | null) => {
      if (route.name !== 'atlas') return;
      navigate({ ...route, lens: id });
    },
    [route, navigate],
  );
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
        case 'theme':
          return navigate({ name: 'theme', id: command.id });
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

  const lit = legs.filter((leg) => leg.visible).length;
  const latest = legs.find((leg) => leg.category.id === selected[selected.length - 1]);

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
          onOpenCause={openCause}
        />
      ) : (
        <Text style={styles.missing}>no hay ninguna entrada con ese identificador. vuelve y pulsa.</Text>
      )
    ) : route.name === 'lives' ? (
      <LivesView themes={themes} reduceMotion={reduceMotion} onOpenTheme={openTheme} />
    ) : route.name === 'theme' ? (
      themeState ? (
        <ThemeView state={themeState} reduceMotion={reduceMotion} onOpenFigure={openFigure} />
      ) : (
        <Text style={styles.missing}>no hay ningún tema con ese nombre. vuelve a las biografías.</Text>
      )
    ) : route.name === 'figure' ? (
      figure ? (
        <FigureView
          key={figure.id}
          figure={figure}
          corpus={corpus}
          reduceMotion={reduceMotion}
          onOpenEntry={openEntry}
          onOpenTheme={openTheme}
        />
      ) : (
        <Text style={styles.missing}>no hay ninguna figura con ese nombre. vuelve a las biografías.</Text>
      )
    ) : route.name === 'drift' ? (
      <DriftView
        corpus={corpus}
        seed={route.seed}
        mode={route.mode}
        leg={route.leg}
        // El cuadro nunca es mayor que la columna que lo contiene.
        size={Math.min(centro, 460)}
        onOpen={openEntry}
        onMode={setDriftMode}
      />
    ) : route.name === 'web' ? (
      <Tejido
        corpus={corpus}
        focus={route.focus}
        skin={route.skin}
        size={webSize}
        reduceMotion={reduceMotion}
        onFocus={weave}
        onSkin={setSkin}
        onOpen={openEntry}
        onMap={openMap}
      />
    ) : route.name === 'atlas' ? (
      <AtlasView
        atlas={loadAtlas()}
        corpus={corpus}
        focus={route.country}
        lens={route.lens}
        width={Math.min(centro, 1000)}
        reduceMotion={reduceMotion}
        onFocus={setAtlasCountry}
        onLens={setAtlasLens}
        onOpenEntry={openEntry}
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
    ) : route.name === 'lives' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'theme' ? (
      <View style={styles.buttons}>
        {themeState && themeState.entries.length > 0 ? (
          <TextButton
            label="invocar desde este tema"
            onPress={() => pressWith(themeState.theme.id)}
            hint={`solo las ${themeState.entries.length} entradas ligadas a este tema`}
          />
        ) : null}
        <TextButton label="biografías" onPress={openLives} />
      </View>
    ) : route.name === 'figure' ? (
      <View style={styles.buttons}>
        <TextButton label="biografías" onPress={openLives} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'archive' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'web' || route.name === 'atlas' ? (
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
        <TextButton label="invocar" onPress={press} hint="pulsa la araña y sale algo que no buscabas" />
      </View>
    );

  /**
   * Las secciones, a la izquierda. Antes eran una botonera que envolvía en
   * dos filas descuadradas al pie del texto; ahora son una columna con su
   * estado, como una consola. Invocar está arriba del todo porque es lo
   * único que hace algo en vez de llevar a otro sitio.
   */
  const groups: ShellGroup[] = [
    {
      label: 'el oráculo',
      items: [
        { id: 'invocar', label: 'invocar', hint: 'pulsa la araña', onPress: press },
        {
          id: 'portada',
          label: 'la araña',
          hint: 'el animal y sus once patas',
          onPress: () => navigate(HOME),
          active: route.name === 'home' && panel === 'patas',
        },
        {
          id: 'proposito',
          label: 'propósito',
          hint: 'para qué es esto',
          onPress: () => {
            setPanel('proposito');
            navigate(HOME);
          },
          active: route.name === 'home' && panel === 'proposito',
        },
      ],
    },
    {
      label: 'la red',
      items: [
        { id: 'tela', label: 'la tela', hint: 'el grafo, vivo', onPress: openWeb, active: route.name === 'web' },
        {
          id: 'atlas',
          label: 'el atlas',
          hint: 'el mapa y sus finales',
          onPress: openAtlas,
          active: route.name === 'atlas',
        },
        { id: 'forma', label: 'la forma', hint: 'cómo está repartido', onPress: openShape, active: route.name === 'shape' },
      ],
    },
    {
      label: 'el archivo',
      items: [
        { id: 'archivo', label: 'archivo', hint: 'filtros y búsqueda', onPress: openArchive, active: route.name === 'archive' },
        {
          id: 'biografias',
          label: 'biografías',
          hint: 'vidas por temas',
          onPress: openLives,
          active: route.name === 'lives' || route.name === 'theme' || route.name === 'figure',
        },
      ],
    },
  ];

  /**
   * El centro. En la portada, el animal y nada más: es lo que se pulsa.
   * En cualquier sección, la sección sola, con todo el ancho.
   */
  const contenido = reading ?? (
    <View style={styles.hero}>
      <View style={{ width: stageWeb, height: stageWeb }}>{spider}</View>
      <Text style={styles.lead}>{LEAD}</Text>
      {latest ? <Text style={styles.latest}>última pata apoyada: {latest.category.name}</Text> : null}
    </View>
  );

  /** La derecha: las once patas como interruptores, y el estado del archivo. */
  const aside = (
    <View>
      <LegPanel legs={legs} selected={active} onToggle={toggle} onClear={() => setSelected(NONE)} />
      <View style={styles.readout}>
        <Text style={styles.readoutLabel}>estado</Text>
        <Text style={styles.readoutLine}>{corpus.entries.length} entradas · {lit} de {legs.length} patas</Text>
        <Text style={styles.readoutLine}>{corpus.figures.length} biografías · {corpus.themes.length} temas</Text>
        {route.name === 'invocation' ? <Text style={styles.readoutLine}>semilla {route.seed}</Text> : null}
        <Text style={styles.readoutHint}>⌘K abre la paleta</Text>
      </View>
    </View>
  );

  const titulo =
    route.name === 'home'
      ? 'aracne'
      : route.name === 'invocation'
        ? 'invocación'
        : route.name === 'entry'
          ? (entry?.title ?? 'entrada')
          : route.name === 'web'
            ? 'la tela'
            : route.name === 'atlas'
              ? 'el atlas de la extinción'
              : route.name === 'archive'
                ? 'el archivo'
                : route.name === 'shape'
                  ? 'la forma del archivo'
                  : route.name === 'figure'
                    ? (figure?.name ?? 'figura')
                    : route.name === 'theme'
                      ? (themeState?.theme.name ?? 'tema')
                      : 'biografías';

  const metaLinea =
    route.name === 'invocation'
      ? `${route.seed} · ${active.length} patas apoyadas`
      : `${corpus.entries.length} entradas · ${lit} de ${legs.length} patas`;

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <Shell
        groups={groups}
        title={titulo}
        meta={metaLinea}
        aside={aside}
        footer={buttons}
        compact={portrait}
      >
        {contenido}
      </Shell>
      {palette ? (
        <CommandPalette corpus={corpus} legs={legs} onRun={run} onClose={() => setPalette(false)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // La portada: el animal grande y una sola línea debajo.
  hero: { alignItems: 'center', paddingTop: space.sm },
  lead: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 30,
    color: colors.dim,
    maxWidth: 460,
    textAlign: 'center',
    marginTop: space.md,
  },
  latest: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.line,
    marginTop: space.sm,
  },

  // El estado, bajo los interruptores: cifras, no prosa.
  readout: {
    marginTop: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  readoutLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  readoutLine: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    lineHeight: 18,
    color: colors.dim,
  },
  readoutHint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 16,
    color: colors.line,
    marginTop: space.xs,
  },

  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  missing: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
  },
});
