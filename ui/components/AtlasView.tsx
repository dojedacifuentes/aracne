import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import {
  clampView,
  frame,
  MIN_ZOOM,
  project,
  toScreen,
  zoomAt,
  type Viewport,
} from '../../lib/atlas/projection';
import {
  background,
  bandOf,
  dominant,
  heatScale,
  readAll,
  scored,
  type Atlas,
  type HeatScale,
  type Cause,
  type Country,
} from '../../lib/atlas/world';
import { readCountry } from '../../lib/atlas/score';
import { bridgeText, entriesForCause } from '../../lib/atlas/bridge';
import type { Corpus } from '../../lib/content/corpus';
import { catalogId } from '../../lib/labels';
import { useFocusRing } from '../hooks/useFocusRing';
import { canvasSize } from '../lib/layout';
import { colors, fonts, heat, machine, space } from '../theme';
import { Chip } from './Chip';

/** Lo que se guarda de la vista: el resto se deriva del lienzo. */
interface Camera {
  zoom: number;
  center: { x: number; y: number };
}

type Props = {
  atlas: Atlas;
  /** El archivo, para poder cruzar cada causa con lo que ya está escrito. */
  corpus: Corpus;
  /** País en el panel, por su código. */
  focus: string | null;
  /** Causa con la que se pinta el mapa. null es el score general. */
  lens: string | null;
  width: number;
  /** Lo que queda de pantalla. El mapa no pasa de aquí. */
  maxHeight: number;
  reduceMotion: boolean;
  onFocus: (id: string | null) => void;
  onLens: (id: string | null) => void;
  onOpenEntry: (id: string) => void;
};

type AsideProps = {
  atlas: Atlas;
  lens: string | null;
  onLens: (id: string | null) => void;
};

/** Proporción del lienzo. El mundo de Robinson es 2:1; se deja aire para el zoom. */
const RATIO = 0.62;

/** Lo que tarda el barrido en cruzar el mundo, en segundos. */
const SWEEP = 11;

const FRAME_MS = 33;

/** Qué dice cada factor cuando hay que explicarlo en la ficha. */
const FACTOR_LABEL: Record<string, string> = {
  poblacion: 'por su población',
  densidad: 'por su densidad',
  superficie: 'por su superficie',
  renta: 'por su renta',
  industria: 'por su industria',
  tropical: 'por estar en el trópico',
  polar: 'por su latitud alta',
  insular: 'por su costa fragmentada',
  continental: 'por ser interior',
  arsenal: 'por su arsenal',
};

const CONTINENT_LABEL: Record<string, string> = {
  Africa: 'África',
  Asia: 'Asia',
  Europe: 'Europa',
  'North America': 'América del Norte',
  'South America': 'América del Sur',
  Oceania: 'Oceanía',
  Antarctica: 'Antártida',
  'Seven seas (open ocean)': 'mar abierto',
};

const miles = (n: number) => n.toLocaleString('es-ES');

/** Lo que el mapa pinta bajo una lente: el score de cada país y sus cortes. */
interface Heat {
  lecturas: Map<string, { score: number; cause: Cause | null }>;
  scale: HeatScale;
}

/**
 * El score de cada país bajo la lente actual, con su causa, y la escala que
 * sale de ese reparto. Lo que no tiene población estable no puntúa: un atlas
 * de exposición humana no tiene nada que decir de la Antártida, y pintarla de
 * un color cualquiera sería inventarse un dato.
 *
 * Vive fuera del componente porque **la leyenda está en la otra columna**: el
 * mapa y la leyenda tienen que enseñar los mismos cortes, y la única manera de
 * garantizarlo es que los dos los saquen de aquí. Cada uno con su escala
 * duraría hasta la primera lente en la que difirieran.
 */
function readWorld(
  countries: readonly Country[],
  causes: readonly Cause[],
  lensCause: Cause | null,
): Heat {
  const lecturas: Heat['lecturas'] = new Map();
  for (const country of countries) {
    if (!scored(country)) continue;
    if (lensCause) {
      lecturas.set(country.id, { score: readCountry(country, lensCause.rule).score, cause: lensCause });
    } else {
      const top = dominant(country, causes);
      lecturas.set(country.id, { score: top?.score ?? 0, cause: top?.cause ?? null });
    }
  }
  return { lecturas, scale: heatScale([...lecturas.values()].map((l) => l.score)) };
}

/**
 * El Atlas de la extinción.
 *
 * Un mapa mundial donde cada país arde según lo expuesto que esté a treinta
 * maneras de que se acabe la especie. **Las puntuaciones son ficción, pero no
 * están escritas a mano**: cada causa trae una regla, la regla se aplica a
 * datos con procedencia —Natural Earth: población, superficie, renta,
 * latitud, costa— y la ficha enseña la cuenta entera. Un atlas que no puede
 * explicar sus números es un cartel.
 *
 * Tres decisiones que lo sostienen:
 *
 * 1. **Robinson, no Mercator.** Este mapa habla de cuánta gente hay en cada
 *    sitio; una proyección que triplica Groenlandia miente sobre el argumento.
 * 2. **El score general es el máximo, nunca la suma.** Sumar causas que se
 *    excluyen daría un número sin sentido.
 * 3. **Las causas uniformes no entran en el reparto.** El asteroide le toca
 *    igual a todo el mundo, así que no distingue a nadie: si entrara, el mapa
 *    entero diría «100» y no sería un mapa. Se enseñan aparte, como el fondo.
 */
export function AtlasView({
  atlas,
  corpus,
  focus,
  lens,
  width: columna,
  maxHeight,
  reduceMotion,
  onFocus,
  onLens,
  onOpenEntry,
}: Props) {
  /**
   * El lienzo cabe en la columna **y** en lo que queda de pantalla. Antes solo
   * se medía con la columna, así que en cualquier portátil el mapa salía más
   * alto que la ventana y había que bajar para verlo entero: un mapa que no se
   * ve de una vez no es un mapa, es un rollo.
   */
  const width = canvasSize(columna, Math.round(maxHeight / RATIO), 1000);
  const height = Math.round(width * RATIO);
  const [camera, setCamera] = useState<Camera>({ zoom: MIN_ZOOM, center: { x: 0.5, y: 0.5 } });
  const [hovered, setHovered] = useState<string | null>(null);
  const [clock, setClock] = useState(0);

  /**
   * La vista se deriva del lienzo y de la cámara. Guardar la vista entera en
   * el estado obligaría a corregirla con un efecto cada vez que la ventana
   * cambia de tamaño, y un efecto que llama a setState vuelve a pintar dos
   * veces por nada.
   */
  const view = useMemo<Viewport>(
    () => clampView({ width, height, zoom: camera.zoom, center: camera.center }),
    [width, height, camera],
  );

  /** Mover la cámara siempre parte de la vista de ahora, sin leer refs. */
  const mover = (paso: (actual: Viewport) => Viewport) => {
    setCamera((actual) => {
      const siguiente = paso(clampView({ width, height, zoom: actual.zoom, center: actual.center }));
      return { zoom: siguiente.zoom, center: siguiente.center };
    });
  };

  /** El barrido del instrumento. Solo corre si hay alguien mirando. */
  useEffect(() => {
    if (reduceMotion || typeof window === 'undefined') return;
    let frameId = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        setClock((now - start) / 1000);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [reduceMotion]);

  const causes = atlas.causes;
  const countries = atlas.world.countries;
  const lensCause = lens ? (causes.find((cause) => cause.id === lens) ?? null) : null;

  /**
   * La proyección se hace una vez. Mover el mapa solo multiplica y suma: si
   * se proyectara en cada fotograma, arrastrar costaría cuatro mil senos.
   */
  const projected = useMemo(() => {
    const out = new Map<string, number[][]>();
    for (const country of countries) {
      out.set(
        country.id,
        country.rings.map((ring) => {
          const plano: number[] = [];
          for (let i = 0; i < ring.length; i += 2) {
            const p = project(ring[i], ring[i + 1]);
            plano.push(p.x, p.y);
          }
          return plano;
        }),
      );
    }
    return out;
  }, [countries]);

  const { lecturas, scale } = useMemo(() => readWorld(countries, causes, lensCause), [countries, causes, lensCause]);

  const paths = useMemo(() => {
    const out: { id: string; d: string; band: number }[] = [];
    for (const country of countries) {
      const anillos = projected.get(country.id) ?? [];
      let d = '';
      for (const ring of anillos) {
        for (let i = 0; i < ring.length; i += 2) {
          const p = toScreen({ x: ring[i], y: ring[i + 1] }, view);
          d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        }
        d += 'Z';
      }
      const lectura = lecturas.get(country.id);
      out.push({ id: country.id, d, band: lectura ? bandOf(lectura.score, scale) : -1 });
    }
    return out;
  }, [countries, projected, view, lecturas, scale]);

  /** La retícula: meridianos y paralelos cada treinta grados. */
  const graticule = useMemo(() => {
    const lineas: string[] = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const puntos: string[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const p = toScreen(project(lon, lat), view);
        puntos.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      lineas.push(puntos.join(' '));
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const puntos: string[] = [];
      for (let lon = -180; lon <= 180; lon += 10) {
        const p = toScreen(project(lon, lat), view);
        puntos.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      lineas.push(puntos.join(' '));
    }
    return lineas;
  }, [view]);

  /** Los cinco más expuestos bajo la lente actual: laten. */
  const focos = useMemo(() => {
    return [...countries]
      .filter(scored)
      .map((country) => ({ country, score: lecturas.get(country.id)?.score ?? 0 }))
      .sort((a, b) => b.score - a.score || a.country.id.localeCompare(b.country.id))
      .slice(0, 5);
  }, [countries, lecturas]);

  // Arrastrar para mover. El mapa no se sale del cuadro: lo impide clampView.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => {
          if (Math.abs(g.dx) <= 3 && Math.abs(g.dy) <= 3) return false;
          // Con el mapa en reposo, un arrastre vertical es de la página: en un
          // teléfono el mapa ocupa el ancho entero y quedarse con el dedo
          // dejaba la sección sin manera de bajar. Ampliado sí es suyo, porque
          // entonces hay mundo fuera del cuadro por los cuatro lados.
          return Math.abs(g.dx) > Math.abs(g.dy) || camera.zoom > MIN_ZOOM;
        },
        onPanResponderMove: (_e, g) => {
          mover((actual) => {
            const escala = actual.width * actual.zoom;
            return clampView({
              ...actual,
              center: { x: actual.center.x - g.dx / escala, y: actual.center.y - g.dy / escala },
            });
          });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, camera.zoom],
  );

  const lienzo = useRef<View | null>(null);

  /**
   * La rueda amplía donde está el cursor, **pero solo con ctrl o ⌘**, que es
   * también lo que manda un pellizco en el trackpad.
   *
   * Antes se quedaba con toda la rueda. Como el mapa ocupa casi la pantalla
   * entera, el cursor estaba siempre encima y la sección no se podía bajar:
   * girar la rueda ampliaba el mundo en vez de mover la página. Para ampliar
   * sin modificador están los dos botones de la barra, que además dicen que
   * existen.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const nodo = lienzo.current as unknown as HTMLElement | null;
    if (!nodo) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const caja = nodo.getBoundingClientRect();
      const punto = { x: event.clientX - caja.left, y: event.clientY - caja.top };
      mover((actual) => zoomAt(actual, event.deltaY < 0 ? 1.18 : 1 / 1.18, punto));
    };
    nodo.addEventListener('wheel', onWheel, { passive: false });
    return () => nodo.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const country = focus ? (countries.find((c) => c.id === focus) ?? null) : null;

  const irA = (destino: Country) => mover(() => frame(destino.rings, width, height));

  const acercar = (factor: number) =>
    mover((actual) => zoomAt(actual, factor, { x: width / 2, y: height / 2 }));

  const sweepX = reduceMotion ? -1 : ((clock % SWEEP) / SWEEP) * width;
  const latido = reduceMotion ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(clock * 1.9));

  const lecturasPais = useMemo(
    () => (country ? readAll(country, causes) : []),
    [country, causes],
  );
  const fondo = useMemo(() => background(causes), [causes]);

  return (
    <View>
      {/* El título lo pone la cabecera de la consola: repetirlo aquí solo
          robaba alto a un mapa que tiene que caber de una vez. */}
      <Text style={styles.lead}>
        {causes.length} maneras de que se acabe, repartidas por el mundo. cada país arde según su regla, y la regla se
        enseña entera: el número sale de su población, su superficie, su renta, su latitud y su costa.
      </Text>

      <View
        ref={lienzo}
        style={[styles.canvas, { width, height }]}
        {...pan.panHandlers}
      >
        <Svg width={width} height={height}>
          {/* El mar, y sobre él la retícula: el instrumento antes que el dato. */}
          <Rect x={0} y={0} width={width} height={height} fill={colors.bg} />
          {graticule.map((puntos, i) => (
            <Polyline
              key={`ret${i}`}
              points={puntos}
              fill="none"
              stroke={machine}
              strokeWidth={0.5}
              opacity={0.16}
            />
          ))}

          {paths.map(({ id, d, band }) => {
            const encima = hovered === id;
            const elegido = focus === id;
            return (
              <Path
                key={id}
                d={d}
                fill={band < 0 ? colors.surface : heat[band]}
                stroke={elegido || encima ? machine : colors.bg}
                strokeWidth={elegido ? 1.4 : encima ? 1 : 0.4}
                strokeDasharray={band < 0 ? '2 3' : undefined}
                opacity={band < 0 ? 0.6 : elegido || encima ? 1 : 0.94}
                onPress={() => onFocus(id === focus ? null : id)}
                onPressIn={() => setHovered(id)}
                // @ts-expect-error react-native-svg en web sí entiende el ratón
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered((actual) => (actual === id ? null : actual))}
              />
            );
          })}

          {/* Los focos laten: es donde la lente actual quema más. */}
          {focos.map(({ country: foco, score }) => {
            const p = toScreen(project(foco.lon, foco.lat), view);
            if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) return null;
            return (
              <Circle
                key={`foco${foco.id}`}
                cx={p.x}
                cy={p.y}
                r={2 + (score / 100) * 2.5}
                fill={heat[4]}
                opacity={0.35 + 0.55 * latido}
              />
            );
          })}

          {/* El barrido. No mide nada: dice que el instrumento está encendido. */}
          {sweepX >= 0 ? (
            <>
              <Rect x={sweepX - 26} y={0} width={26} height={height} fill={machine} opacity={0.05} />
              <Line x1={sweepX} y1={0} x2={sweepX} y2={height} stroke={machine} strokeWidth={1} opacity={0.35} />
            </>
          ) : null}

          {/* Las escuadras del país elegido, que respiran. */}
          {country
            ? (() => {
                const p = toScreen(project(country.lon, country.lat), view);
                const half = 14 * (reduceMotion ? 1 : 0.85 + 0.15 * latido);
                const brazo = 5;
                return [
                  [-1, -1],
                  [1, -1],
                  [-1, 1],
                  [1, 1],
                ].map(([sx, sy]) => (
                  <Path
                    key={`esc${sx}${sy}`}
                    d={`M ${p.x + sx * half - sx * brazo} ${p.y + sy * half} L ${p.x + sx * half} ${p.y + sy * half} L ${p.x + sx * half} ${p.y + sy * half - sy * brazo}`}
                    fill="none"
                    stroke={machine}
                    strokeWidth={1.2}
                  />
                ));
              })()
            : null}

          {/* El marco del grabado: doble filete, por dentro del lienzo. */}
          <Rect
            x={0.5}
            y={0.5}
            width={width - 1}
            height={height - 1}
            fill="none"
            stroke={colors.line}
            strokeWidth={1}
          />
          <Rect
            x={3.5}
            y={3.5}
            width={width - 7}
            height={height - 7}
            fill="none"
            stroke={colors.line}
            strokeWidth={0.5}
            opacity={0.6}
          />
        </Svg>
      </View>

      <View style={styles.bar}>
        <Text style={styles.readout} numberOfLines={1}>
          {hovered
            ? `${countries.find((c) => c.id === hovered)?.name ?? hovered} · ${
                lecturas.has(hovered)
                  ? `${lecturas.get(hovered)?.score} · ${lecturas.get(hovered)?.cause?.name ?? ''}`
                  : 'sin población estable: el Atlas no puntúa aquí'
              }`
            : `${countries.length} territorios · ${causes.length} causas · lente: ${lensCause ? lensCause.name.toLowerCase() : 'score general'} · ×${view.zoom.toFixed(1)}`}
        </Text>
        <View style={styles.zoom}>
          <Chip label="−" on={false} onPress={() => acercar(1 / 1.6)} hint="alejar" />
          <Chip label="+" on={false} onPress={() => acercar(1.6)} hint="acercar" />
          <Chip
            label="todo el mundo"
            on={false}
            onPress={() => mover(() => clampView({ width, height, zoom: MIN_ZOOM, center: { x: 0.5, y: 0.5 } }))}
          />
          {country ? <Chip label={`ir a ${country.name}`} on={false} onPress={() => irA(country)} /> : null}
        </View>
      </View>

      {lensCause ? (
        <View style={styles.block}>
          <Text style={styles.causeName}>{lensCause.name}</Text>
          <Text style={styles.causeMeta}>
            {lensCause.uniform ? 'uniforme · le toca igual a todo el mundo' : 'se reparte'} ·{' '}
            {lensCause.rule.factors.map((f) => `${FACTOR_LABEL[f.kind]} ${f.weight > 0 ? '+' : ''}${f.weight}`).join(' · ') ||
              'sin factores'}
          </Text>
          <Text style={styles.premise}>{lensCause.premise}</Text>
          <Text style={styles.literary}>{lensCause.literary}</Text>
          <Text style={styles.terminal}>{lensCause.terminal}</Text>
          {(() => {
            // Lo que el archivo ya tenía escrito sobre esto. No se lista a
            // mano: se cruza por tags y patas, así que una entrada nueva
            // aparece aquí sola el día que se escribe.
            const puentes = entriesForCause(lensCause, corpus.entries).slice(0, 4);
            if (puentes.length === 0) return null;
            return (
              <View style={styles.block}>
                <Text style={styles.label}>en el archivo</Text>
                {puentes.map((puente) => (
                  <Pressable
                    key={puente.entry.id}
                    accessibilityRole="link"
                    accessibilityLabel={puente.entry.title}
                    accessibilityHint="abre la entrada"
                    onPress={() => onOpenEntry(puente.entry.id)}
                    style={styles.bridge}
                  >
                    <Text style={styles.bridgeCatalog}>{catalogId(puente.entry.id)}</Text>
                    <Text style={styles.bridgeTitle}>{puente.entry.title}</Text>
                    <Text style={styles.bridgeWhy}>{bridgeText(puente, corpus.categories)}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })()}

          {lensCause.inspiration.length > 0 ? (
            <Text style={styles.inspiration}>
              a partir de{' '}
              {lensCause.inspiration
                .map((i) => [i.label, i.author, i.year].filter(Boolean).join(', '))
                .join(' · ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {country ? (
        <CountryPanel
          country={country}
          readings={lecturasPais}
          background={fondo}
          scale={scale}
          onLens={onLens}
          onClose={() => onFocus(null)}
        />
      ) : (
        <Text style={styles.hint}>pulsa un territorio para abrir su ficha.</Text>
      )}

      <Text style={styles.colophon}>
        atlas de ficción especulativa. las puntuaciones pertenecen al universo de la obra y no describen riesgo
        real de ningún país. la geometría y los datos de población, superficie y renta son de {atlas.world.source.name},
        {' '}en {atlas.world.source.license}.
      </Text>
    </View>
  );
}

function CountryPanel({
  country,
  readings,
  background: fondo,
  scale,
  onLens,
  onClose,
}: {
  country: Country;
  readings: ReturnType<typeof readAll>;
  background: Cause[];
  /** La misma escala que pinta el mapa: la barra y el país tienen que decir lo mismo. */
  scale: HeatScale;
  onLens: (id: string | null) => void;
  onClose: () => void;
}) {
  const reparto = scored(country) ? readings.filter((r) => !r.cause.uniform) : [];
  const top = reparto[0];
  const densidad = country.area > 0 ? country.pop / country.area : 0;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelName}>{country.name}</Text>
        <Text style={styles.panelScore}>{top ? top.score : 0}</Text>
      </View>
      <Text style={styles.panelMeta}>
        {country.id} · {CONTINENT_LABEL[country.continent] ?? country.continent} ·{' '}
        {miles(Math.round(country.pop))} habitantes{country.popYear ? ` (${country.popYear})` : ''} ·{' '}
        {miles(country.area)} km² · {densidad.toFixed(1)} hab/km²
      </Text>

      {!scored(country) ? (
        <Text style={styles.panelTerminal}>
          sin población estable. el Atlas mide exposición humana, así que aquí no tiene nada que medir y no
          inventa un número.
        </Text>
      ) : null}

      {top ? (
        <>
          <Text style={styles.label}>causa dominante</Text>
          <Text style={styles.panelCause}>{top.cause.name}</Text>
          <Text style={styles.panelRule}>
            {top.base} de base
            {top.parts
              .filter((p) => p.delta !== 0)
              .map((p) => ` · ${FACTOR_LABEL[p.kind]} ${p.delta > 0 ? '+' : ''}${p.delta}`)
              .join('')}
          </Text>
          <Text style={styles.panelTerminal}>{top.cause.terminal}</Text>
        </>
      ) : null}

      {reparto.length > 0 ? <Text style={styles.label}>lo que más lo alcanza</Text> : null}
      {reparto.slice(0, 6).map((lectura) => (
        <Pressable
          key={lectura.cause.id}
          accessibilityRole="button"
          accessibilityLabel={lectura.cause.name}
          accessibilityHint={`${lectura.score} de cien. pinta el mapa con esta causa`}
          onPress={() => onLens(lectura.cause.id)}
          style={styles.row}
        >
          <Text style={styles.rowScore}>{String(lectura.score).padStart(3, ' ')}</Text>
          <View style={styles.rowBarTrack}>
            <View
              style={[
                styles.rowBar,
                { width: `${lectura.score}%`, backgroundColor: heat[bandOf(lectura.score, scale)] },
              ]}
            />
          </View>
          <Text style={styles.rowName} numberOfLines={1}>
            {lectura.cause.name.toLowerCase()}
          </Text>
        </Pressable>
      ))}

      <Text style={styles.label}>el fondo</Text>
      <Text style={styles.panelBackground}>
        {fondo.map((cause) => cause.name.toLowerCase()).join(' · ')}. le tocan igual a todo el mundo, así que no
        distinguen a nadie y quedan fuera del reparto.
      </Text>

      <View style={styles.zoom}>
        <Chip label="cerrar la ficha" on={false} onPress={onClose} />
      </View>
    </View>
  );
}

/**
 * El instrumento del Atlas: la lente y la leyenda.
 *
 * La lente es una lista y no una fila de fichas porque son treinta y cuatro
 * causas: en fila había que arrastrarlas de lado para ver las últimas, y una
 * lente que esconde la mitad de sus posiciones no es una lente. Y van
 * separadas en dos, porque **esa separación es el argumento del Atlas**: las
 * que reparten distinguen a unos países de otros; las uniformes le tocan igual
 * a todo el mundo y no distinguen a nadie. Ni la separación ni el orden están
 * escritos a mano: salen de `uniform` y del score que cada regla produce.
 */
export function AtlasAside({ atlas, lens, onLens }: AsideProps) {
  const causes = atlas.causes;
  const lensCause = lens ? (causes.find((cause) => cause.id === lens) ?? null) : null;
  const { scale } = useMemo(
    () => readWorld(atlas.world.countries, causes, lensCause),
    [atlas.world.countries, causes, lensCause],
  );

  const reparten = causes.filter((cause) => !cause.uniform);
  const fondo = background(causes);

  return (
    <View>
      <View style={styles.asideHead}>
        <Text style={styles.asideLabel}>la lente</Text>
        <Text style={[styles.asideState, lensCause ? styles.asideStateOn : null]}>
          {lensCause ? 'una causa' : 'score general'}
        </Text>
      </View>

      {/* La leyenda va primero: es lo que hace legible lo que ya se está
          mirando, y cabe entera sin bajar. */}
      {heat.map((color, i) => {
        const desde = i === 0 ? 0 : scale.cuts[i - 1];
        const hasta = i === heat.length - 1 ? 100 : scale.cuts[i] - 1;
        return (
          <View key={color} style={styles.band}>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <Text style={styles.bandText}>
              {desde}–{hasta}
            </Text>
          </View>
        );
      })}
      <Text style={styles.bandNote}>
        quintiles: cada tramo lleva una quinta parte del mundo, y los cortes cambian con la lente
      </Text>

      <View style={styles.asideBlock}>
        <LensRow label="score general" on={lens === null} onPress={() => onLens(null)} />
      </View>

      <Text style={styles.asideGroup}>las que reparten · {reparten.length}</Text>
      {reparten.map((cause) => (
        <LensRow
          key={cause.id}
          label={cause.name.toLowerCase()}
          on={lens === cause.id}
          onPress={() => onLens(cause.id === lens ? null : cause.id)}
        />
      ))}

      <Text style={styles.asideGroup}>el fondo · {fondo.length}</Text>
      {fondo.map((cause) => (
        <LensRow
          key={cause.id}
          label={cause.name.toLowerCase()}
          on={lens === cause.id}
          onPress={() => onLens(cause.id === lens ? null : cause.id)}
          mark="igual"
          hint="uniforme: le toca igual a todo el mundo, así que el mapa entero sale del mismo color"
        />
      ))}

      <Text style={styles.bandNote}>
        arrastrar mueve el mapa · ctrl o ⌘ con la rueda amplía · la rueda sola baja la página
      </Text>
    </View>
  );
}

/** Una posición de la lente. Misma gramática que un conmutador de pata. */
function LensRow({
  label,
  on,
  onPress,
  mark,
  hint,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  mark?: string;
  hint?: string;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint ?? 'pinta el mapa con esta causa'}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.lensRow, on && styles.lensRowOn, focusVisible && styles.focus]}
    >
      <View style={[styles.lensBar, on && styles.lensBarOn]} />
      <Text style={[styles.lensName, (on || hovered) && styles.lensNameOn]} numberOfLines={1}>
        {label}
      </Text>
      {on ? <Text style={styles.lensMark}>ON</Text> : mark ? <Text style={styles.lensFaint}>{mark}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 27,
    color: colors.dim,
    marginBottom: space.md,
    maxWidth: 680,
  },
  canvas: { alignSelf: 'center' },

  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  readout: {
    flex: 1,
    minWidth: 240,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: machine,
  },
  zoom: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },

  band: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 1 },
  swatch: { width: 22, height: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  bandText: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, color: colors.dim },
  bandNote: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, color: colors.dim },

  block: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.8,
    color: colors.dim,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  lens: { gap: space.sm, paddingVertical: 2 },

  causeName: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 32, color: colors.text, marginTop: space.xs },
  causeMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: machine,
    marginTop: 2,
  },
  premise: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 27,
    color: colors.dim,
    marginTop: space.sm,
    maxWidth: 680,
  },
  literary: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 31,
    color: colors.text,
    marginTop: space.sm,
    maxWidth: 680,
  },
  terminal: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 26,
    color: colors.dim,
    marginTop: space.sm,
    maxWidth: 680,
  },
  inspiration: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.sm,
  },

  panel: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    maxWidth: 680,
  },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  panelName: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, color: colors.text, flex: 1 },
  panelScore: { fontFamily: fonts.mono, fontSize: 28, lineHeight: 36, color: heat[4], letterSpacing: 1.2 },
  panelMeta: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, lineHeight: 18, color: colors.dim },
  panelCause: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 29, color: colors.text },
  panelRule: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: machine,
    marginTop: 2,
  },
  panelTerminal: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 26, color: colors.dim, marginTop: space.xs },
  panelBackground: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 24, color: colors.dim },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 26, outlineWidth: 0 },
  rowScore: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, color: colors.dim, width: 30 },
  rowBarTrack: { width: 120, height: 8, backgroundColor: colors.surface },
  rowBar: { height: 8 },
  rowName: { flex: 1, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, color: colors.text },

  hint: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 26, color: colors.dim, marginTop: space.md },
  bridge: { minHeight: 44, justifyContent: 'center', paddingVertical: space.xs, outlineWidth: 0 },
  bridgeCatalog: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, color: colors.accent },
  bridgeTitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, color: colors.text },
  bridgeWhy: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.72, lineHeight: 18, color: colors.dim },
  colophon: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.lg,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    maxWidth: 680,
  },

  // La columna del instrumento: versales en mono, como las patas.
  asideHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  asideLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  asideState: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.dim },
  asideStateOn: { color: machine },
  asideBlock: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  asideGroup: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginTop: space.md,
    marginBottom: space.xs,
  },

  lensRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingRight: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    outlineWidth: 0,
  },
  lensRowOn: { backgroundColor: colors.bg },
  lensBar: { width: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  lensBarOn: { backgroundColor: machine },
  lensName: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.dim },
  lensNameOn: { color: colors.text },
  lensMark: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: machine },
  lensFaint: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.line },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
