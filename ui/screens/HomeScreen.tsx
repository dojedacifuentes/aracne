import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NO_FILTERS, type ArchiveFilters } from '../../lib/archive/filter';
import { usableLegs } from '../../lib/content/corpus';
import { loadAtlas } from '../../lib/atlas/loader';
import { loadArchive } from '../../lib/content/loader';
import { pressSeed } from '../../lib/oracle';
import { pushHistory } from '../../lib/oracle/history';
import { entriesOfTheme, themeStates } from '../../lib/museum/themes';
import { declaredPairs, pairKey } from '../../lib/drift/graph';
import type { DriftMode, WebSkin } from '../../lib/drift/modes';
import { invoke } from '../../lib/oracle/invoke';
import { freshSeed } from '../../lib/oracle/rng';
import { ArchiveFilterPanel, ArchiveView } from '../components/ArchiveView';
import { AtlasLens, AtlasView } from '../components/AtlasView';
import { AuthorsView } from '../components/AuthorsView';
import { CommandPalette, type Command } from '../components/CommandPalette';
import { Drawer } from '../components/Drawer';
import { DriftView } from '../components/DriftView';
import { EntryDossier } from '../components/EntryDossier';
import { EntryView } from '../components/EntryView';
import { FigureView } from '../components/FigureView';
import { InvocationComposer } from '../components/InvocationComposer';
import { InvocationView } from '../components/InvocationView';
import { ShapeView } from '../components/ShapeView';
import { Shell, NAV_WIDTH, type Measure, type ShellGroup } from '../components/Shell';
import { ToolButton } from '../components/ToolButton';
import { Spider } from '../components/spider/Spider';
import { AracneSpiderEffect } from '../components/spiderEffect/AracneSpiderEffect';
import { Tejido, TelaAside } from '../components/Tejido';
import { TextButton } from '../components/TextButton';
import { useRoute } from '../hooks/useRoute';
import { useSound } from '../hooks/useSound';
import { canvasSize, getLayoutMode } from '../lib/layout';
import { ARCHIVE, ATLAS, HOME, LIVES, SHAPE, WEB } from '../lib/route';
import { readHistory, rememberEntries } from '../lib/storedHistory';
import { colors, fonts, machine, space } from '../theme';

type Props = {
  reduceMotion: boolean;
};

/**
 * Qué hay abierto encima del contenido. Uno cada vez: dos instrumentos a la
 * vez son un escritorio, no una consola.
 */
type Cajon = 'invocar' | 'expediente' | 'filtros' | 'lente' | null;

const NONE: readonly string[] = [];

/**
 * Lo único que hay que saber para empezar. No es un tour ni una promesa: dice
 * qué se puede tocar, que es el problema real de una interfaz callada.
 */
const LEAD = 'apoya las patas que quieras y pulsa la araña. lo que salga no lo estabas buscando.';

/**
 * Una sola escena. La ruta decide tres cosas: qué va en el centro, cuánto
 * ancho pide ese centro y qué instrumento puede abrirse encima.
 *
 * Lo que cambió en esta revisión: **ya no hay columna permanente**. Las once
 * patas vivían a la derecha de todas las pantallas, también de una ficha de
 * lectura, cobrando 310 px por un mando que allí no decide nada. Ahora el
 * instrumento se pide —`invocar`, `expediente`, `filtros`, `lente`— y el ancho
 * es del contenido.
 */
export function HomeScreen({ reduceMotion }: Props) {
  const { width, height } = useWindowDimensions();
  const portrait = getLayoutMode(width, height) === 'mobilePortrait';
  const { corpus, legs } = loadArchive();
  const [route, navigate] = useRoute();
  const [selected, setSelected] = useState<readonly string[]>(NONE);
  const [cajon, setCajon] = useState<Cajon>(null);
  const [history, setHistory] = useState<readonly string[]>(NONE);
  const presses = useRef(0);
  const [palette, setPalette] = useState(false);
  const sound = useSound();

  /**
   * El ancho de la columna central. Todo lo que se dibuja va medido con esto y
   * no con el de la ventana: la araña se calculaba con la ventana entera y se
   * salía por encima del menú de la izquierda.
   */
  const centro = portrait ? width - space.md * 2 : Math.max(360, width - NAV_WIDTH - space.md * 2);
  const stageWeb = canvasSize(Math.round(centro * 0.56), height - 280, 460);
  const webSize = canvasSize(centro, height - 240, 760);

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

  /**
   * Lo único que la entidad necesita saber del archivo: si el vínculo entre
   * dos entradas está declarado. Los pares se cuentan una vez; ella pregunta
   * en cada fotograma. Ver `docs/ENTIDAD.md`.
   */
  const declared = useMemo(() => declaredPairs(corpus.entries), [corpus.entries]);
  const linked = useCallback((a: string, b: string) => declared.has(pairKey(a, b)), [declared]);
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

  const toggle = useCallback(
    (id: string) => {
      let apoyada = false;
      setSelected((current) => {
        apoyada = !current.includes(id);
        return apoyada ? [...current, id] : current.filter((x) => x !== id);
      });
      // El hilo de esa pata suena a su propia frecuencia, la misma con la que vibra.
      const leg = legs.find((state) => state.category.id === id)?.category.leg;
      if (leg !== undefined) sound.play({ kind: 'hilo', leg, ringSize: legs.length, supported: apoyada });
    },
    [legs, sound],
  );

  const pressWith = useCallback(
    (room?: string) => {
      const patas = usableLegs(active, legs);
      const state = room ? themes.find((t) => t.theme.id === room) : undefined;
      const from = state ? entriesOfTheme(state, corpus.entries) : corpus.entries;
      presses.current += 1;
      const { seed, invocation: next } = pressSeed(from, patas, Date.now(), presses.current, history);
      setSelected(patas);
      setCajon(null);
      // Las parciales salen de la semilla: la misma URL suena igual en cualquier parte.
      sound.play({ kind: 'dictamen', seed, legs: patas.length });
      navigate(state ? { name: 'invocation', seed, legs: patas, room } : { name: 'invocation', seed, legs: patas });
      if (!next) return;
      const ids = next.entries.map((item) => item.id);
      setHistory((current) => pushHistory(current, ids));
      void rememberEntries(ids);
    },
    [active, legs, themes, corpus.entries, history, navigate, sound],
  );

  const press = useCallback(() => pressWith(), [pressWith]);

  const openEntry = useCallback(
    (id: string) => {
      setCajon(null);
      navigate({ name: 'entry', id });
    },
    [navigate],
  );

  const openTheme = useCallback(
    (id: string | null) => navigate(id ? { name: 'theme', id } : LIVES),
    [navigate],
  );
  const openFigure = useCallback(
    (id: string) => {
      setCajon(null);
      navigate({ name: 'figure', id });
    },
    [navigate],
  );
  const openLives = useCallback(() => navigate(LIVES), [navigate]);
  const openArchive = useCallback(() => navigate(ARCHIVE), [navigate]);
  const openWeb = useCallback(() => navigate(WEB), [navigate]);
  const openAtlas = useCallback(() => navigate(ATLAS), [navigate]);
  const openShape = useCallback(() => navigate(SHAPE), [navigate]);

  /** Desde una entrada se salta al Atlas con esa causa ya puesta. */
  const openCause = useCallback(
    (id: string) => {
      setCajon(null);
      navigate({ name: 'atlas', country: null, lens: id });
    },
    [navigate],
  );
  /** Desde el expediente se salta al archivo filtrado por esa pata. */
  const openCategory = useCallback(
    (id: string) => {
      setCajon(null);
      navigate({ name: 'archive', filters: { ...NO_FILTERS, categories: [id] } });
    },
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
          // Saltar a una pata es apoyarla y abrir el compositor, no invocar:
          // la decisión de pulsar sigue siendo de quien mira.
          setSelected((current) => (current.includes(command.id) ? current : [...current, command.id]));
          setCajon('invocar');
          return navigate(HOME);
      }
    },
    [press, navigate],
  );

  const back = useCallback(() => {
    setSelected(active);
    setCajon(null);
    navigate(HOME);
  }, [active, navigate]);

  const lit = legs.filter((leg) => leg.visible).length;

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
      <View>
        <PatasUsadas legs={legs} active={active} onOpen={() => setCajon('invocar')} />
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
      </View>
    ) : route.name === 'entry' ? (
      entry ? (
        <EntryView
          key={entry.id}
          entry={entry}
          corpus={corpus}
          reduceMotion={reduceMotion}
          compact={portrait}
          dossierOpen={cajon === 'expediente'}
          onToggleDossier={() => setCajon(cajon === 'expediente' ? null : 'expediente')}
        />
      ) : (
        <Text style={styles.missing}>no hay ninguna entrada con ese identificador. vuelve y pulsa.</Text>
      )
    ) : route.name === 'lives' || route.name === 'theme' ? (
      <AuthorsView
        corpus={corpus}
        theme={route.name === 'theme' ? route.id : null}
        compact={portrait}
        onOpenFigure={openFigure}
        onTheme={openTheme}
      />
    ) : route.name === 'figure' ? (
      figure ? (
        <FigureView
          key={figure.id}
          figure={figure}
          corpus={corpus}
          reduceMotion={reduceMotion}
          onOpenEntry={openEntry}
          onOpenTheme={(id) => openTheme(id)}
        />
      ) : (
        <Text style={styles.missing}>no hay ningún autor con ese nombre. vuelve a la cronología.</Text>
      )
    ) : route.name === 'drift' ? (
      <DriftView
        corpus={corpus}
        seed={route.seed}
        mode={route.mode}
        leg={route.leg}
        // El cuadro nunca es mayor que la columna que lo contiene.
        size={Math.min(centro, 560)}
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
        onOpen={openEntry}
        onOpenTools={() => setCajon(cajon === 'lente' ? null : 'lente')}
        toolsOpen={cajon === 'lente'}
      />
    ) : route.name === 'atlas' ? (
      <AtlasView
        atlas={loadAtlas()}
        corpus={corpus}
        focus={route.country}
        lens={route.lens}
        width={centro}
        // El mapa cabe en lo que queda de pantalla: cabecera, pie, el aire de
        // la columna y la barra de lectura ya están descontados.
        maxHeight={height - 250}
        reduceMotion={reduceMotion}
        lensOpen={cajon === 'lente'}
        onToggleLens={() => setCajon(cajon === 'lente' ? null : 'lente')}
        onFocus={setAtlasCountry}
        onLens={setAtlasLens}
        onOpenEntry={openEntry}
      />
    ) : route.name === 'shape' ? (
      <ShapeView corpus={corpus} legs={legs} />
    ) : route.name === 'archive' ? (
      <ArchiveView
        corpus={corpus}
        filters={route.filters}
        compact={portrait}
        filtersOpen={cajon === 'filtros'}
        onToggleFilters={() => setCajon(cajon === 'filtros' ? null : 'filtros')}
        onChange={setFilters}
        onOpen={openEntry}
      />
    ) : null;

  const buttons =
    route.name === 'invocation' ? (
      <View style={styles.buttons}>
        <TextButton label="otra" onPress={press} hint="otra invocación con las mismas patas" />
        <TextButton label="las patas" onPress={() => setCajon('invocar')} hint="cambia las patas apoyadas" />
        <TextButton label="la red" onPress={openDrift} hint="ver esta invocación sobre la tela" />
        <TextButton label="volver" onPress={back} />
      </View>
    ) : route.name === 'theme' && themeState && themeState.entries.length > 0 ? (
      <View style={styles.buttons}>
        <TextButton
          label="invocar desde este tema"
          onPress={() => pressWith(themeState.theme.id)}
          hint={`solo las ${themeState.entries.length} entradas ligadas a este tema`}
        />
        <TextButton label="todos los autores" onPress={openLives} />
      </View>
    ) : route.name === 'home' ? (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} hint="pulsa la araña y sale algo que no buscabas" />
        <TextButton label="las patas" onPress={() => setCajon('invocar')} hint="elige qué categorías se apoyan" />
      </View>
    ) : (
      <View style={styles.buttons}>
        <TextButton label="invocar" onPress={press} />
        <TextButton label="volver" onPress={back} />
      </View>
    );

  /**
   * Las secciones. Tres grupos y siete destinos: el oráculo, la red y el
   * archivo. Fuera quedan «propósito», que ahora se lee pata a pata dentro del
   * compositor, y «biografías», que era una sección global para lo que en
   * realidad es media sección del archivo: los autores.
   */
  const groups: ShellGroup[] = [
    {
      label: 'el oráculo',
      items: [
        {
          id: 'invocar',
          label: 'invocar',
          hint: 'elige patas y pulsa',
          onPress: () => setCajon(cajon === 'invocar' ? null : 'invocar'),
          active: cajon === 'invocar',
        },
        {
          id: 'portada',
          label: 'la araña',
          hint: 'el animal y sus once patas',
          onPress: () => navigate(HOME),
          active: route.name === 'home' || route.name === 'invocation',
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
        {
          id: 'forma',
          label: 'la forma',
          hint: 'cómo está repartido',
          onPress: openShape,
          active: route.name === 'shape' || route.name === 'drift',
        },
      ],
    },
    {
      label: 'el archivo',
      items: [
        {
          id: 'invocaciones',
          label: 'invocaciones',
          hint: `${corpus.entries.length} piezas, con filtros`,
          onPress: openArchive,
          active: route.name === 'archive' || route.name === 'entry',
        },
        {
          id: 'autores',
          label: 'autores',
          hint: 'cronología de quien lo pensó',
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
      <PatasUsadas legs={legs} active={active} onOpen={() => setCajon('invocar')} centrado />
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
                ? 'invocaciones'
                : route.name === 'shape'
                  ? 'la forma del archivo'
                  : route.name === 'figure'
                    ? (figure?.name ?? 'autor')
                    : route.name === 'theme'
                      ? (themeState?.theme.name ?? 'tema')
                      : route.name === 'drift'
                        ? 'la red'
                        : 'autores';

  const metaLinea =
    route.name === 'invocation'
      ? `semilla ${route.seed} · ${active.length} patas`
      : route.name === 'entry'
        ? 'una pieza del archivo'
        : route.name === 'lives' || route.name === 'theme'
          ? 'cronología de autores'
          : route.name === 'figure'
            ? (figure?.years ?? '')
            : `${corpus.entries.length} entradas · ${lit} de ${legs.length} patas`;

  /** La barra de estado: cifras de la máquina, siempre en el mismo sitio. */
  const estado =
    route.name === 'atlas'
      ? `${loadAtlas().world.countries.length} territorios · ${loadAtlas().causes.length} causas`
      : route.name === 'lives' || route.name === 'theme' || route.name === 'figure'
        ? `${corpus.figures.length} autores · ${corpus.themes.length} temas`
        : `${corpus.entries.length} entradas · ${lit}/${legs.length} patas · ⌘K`;

  /** Cuánto ancho pide cada sección. Una ficha no se lee a mil trescientos. */
  const measure: Measure =
    route.name === 'entry' ||
    route.name === 'figure' ||
    route.name === 'lives' ||
    route.name === 'theme'
      ? 'lectura'
      : route.name === 'atlas' || route.name === 'web' || route.name === 'drift' || route.name === 'home'
        ? 'instrumento'
        : 'lista';

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <Shell
        groups={groups}
        title={titulo}
        meta={metaLinea}
        status={estado}
        tools={
          sound.available ? (
            <ToolButton
              label="sonido"
              pressed={sound.on}
              onPress={sound.toggle}
              hint="la araña y sus hilos suenan al tocarlos"
            />
          ) : undefined
        }
        measure={measure}
        footer={buttons}
        compact={portrait}
      >
        {contenido}
      </Shell>

      {/* La entidad: por encima del contenido y por debajo de cajones y paleta. docs/ENTIDAD.md */}
      <AracneSpiderEffect reduceMotion={reduceMotion} linked={linked} />

      <Drawer
        title="invocar"
        meta={`${active.length} de ${legs.length} patas apoyadas`}
        open={cajon === 'invocar'}
        onClose={() => setCajon(null)}
        compact={portrait}
      >
        <InvocationComposer
          legs={legs}
          selected={active}
          entries={corpus.entries}
          onToggle={toggle}
          onClear={() => setSelected(NONE)}
          onInvoke={press}
        />
      </Drawer>

      <Drawer
        title="expediente"
        meta={entry ? entry.addedAt : undefined}
        open={cajon === 'expediente' && Boolean(entry)}
        onClose={() => setCajon(null)}
        compact={portrait}
      >
        {entry ? (
          <EntryDossier
            entry={entry}
            corpus={corpus}
            onOpenFigure={openFigure}
            onOpenCause={openCause}
            onOpenCategory={openCategory}
            onOpenEntry={openEntry}
          />
        ) : null}
      </Drawer>

      <Drawer
        title="filtros"
        meta="el archivo entero, recortado"
        open={cajon === 'filtros' && route.name === 'archive'}
        onClose={() => setCajon(null)}
        compact={portrait}
      >
        {route.name === 'archive' ? (
          <ArchiveFilterPanel corpus={corpus} legs={legs} filters={route.filters} onChange={setFilters} />
        ) : null}
      </Drawer>

      <Drawer
        title="la lente"
        meta="con qué causa se pinta el mundo"
        open={cajon === 'lente' && route.name === 'atlas'}
        onClose={() => setCajon(null)}
        compact={portrait}
      >
        {route.name === 'atlas' ? (
          <AtlasLens atlas={loadAtlas()} lens={route.lens} onLens={setAtlasLens} />
        ) : null}
      </Drawer>

      <Drawer
        title="la tela"
        meta="pieles y mapas"
        open={cajon === 'lente' && route.name === 'web'}
        onClose={() => setCajon(null)}
        compact={portrait}
      >
        {route.name === 'web' ? (
          <TelaAside
            skin={route.skin}
            focus={route.focus}
            onSkin={setSkin}
            onFocus={weave}
            onMap={openMap}
          />
        ) : null}
      </Drawer>

      {palette ? (
        <CommandPalette corpus={corpus} legs={legs} onRun={run} onClose={() => setPalette(false)} />
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Las patas apoyadas, en pequeño. En una invocación ya hecha no hace falta el
 * selector entero: basta saber con qué se pulsó, y poder volver a abrirlo.
 */
function PatasUsadas({
  legs,
  active,
  onOpen,
  centrado = false,
}: {
  legs: ReturnType<typeof loadArchive>['legs'];
  active: readonly string[];
  onOpen: () => void;
  centrado?: boolean;
}) {
  const puestas = legs.filter((leg) => active.includes(leg.category.id));
  if (puestas.length === 0) return null;

  return (
    <Text
      accessibilityRole="button"
      accessibilityLabel={`${puestas.length} patas apoyadas`}
      accessibilityHint="abre el compositor para cambiarlas"
      onPress={onOpen}
      style={[styles.patas, centrado && styles.patasCentradas]}
      numberOfLines={1}
    >
      {puestas.map((leg) => leg.category.name.toLowerCase()).join(' · ')}
    </Text>
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
  patas: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 18,
    color: machine,
    marginBottom: space.sm,
  },
  patasCentradas: { marginTop: space.sm, marginBottom: 0, textAlign: 'center' },

  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  missing: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.dim,
  },
});
