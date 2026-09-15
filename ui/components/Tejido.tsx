import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { RING } from '../../lib/aleph/tension';
import type { Corpus } from '../../lib/content/corpus';
import { neighbours, withinSteps } from '../../lib/drift/graph';
import {
  buildWeb,
  farCrossings,
  pointOnRoute,
  TRACE_GRID,
  traceRoute,
  type Edge,
  type Node,
  type Vertex,
} from '../../lib/drift/layout';
import type { DriftMode, WebSkin } from '../../lib/drift/modes';
import { catalogId } from '../../lib/labels';
import { rngFromString } from '../../lib/oracle/rng';
import { linkText } from '../lib/copy';
import { THREAD_STYLE } from '../lib/epistemic';
import { colors, fonts, machine, space } from '../theme';
import { Chip } from './Chip';
import { ToolButton } from './ToolButton';

type Props = {
  corpus: Corpus;
  /** Entrada en el centro del tejido, o null para el archivo entero. */
  focus: string | null;
  skin: WebSkin;
  size: number;
  reduceMotion: boolean;
  onFocus: (id: string | null) => void;
  onOpen: (id: string) => void;
  /** Abre el cajón con las pieles y los mapas. */
  onOpenTools?: () => void;
  toolsOpen?: boolean;
};

type AsideProps = {
  focus: string | null;
  skin: WebSkin;
  onFocus: (id: string | null) => void;
  onSkin: (skin: WebSkin) => void;
  onMap: (mode: DriftMode) => void;
};

/**
 * La semilla es fija a propósito. Si cambiara en cada visita, los puntos
 * saltarían de sitio y la tela dejaría de ser un mapa: lo que se aprende de
 * dónde cae una entrada tiene que seguir siendo verdad mañana.
 */
const SEED = 'aracne';

/**
 * Aquí se ven más hilos que en ninguna otra parte: éste es el sitio donde la
 * red *es* el contenido, así que el recorte puede bajar.
 */
const MIN_WEIGHT = 0.16;

/**
 * Pasos que se consideran barrio de una entrada. Uno, no dos: con grado medio
 * dieciocho sobre cuarenta y cuatro entradas, a dos pasos está el archivo
 * entero y el recorte no recortaría nada.
 */
const DEPTH = 1;

/** Lo que queda fuera del barrio no se borra: se queda en sombra. */
const GHOST = 0.18;

/**
 * Cuántos pulsos viajan a la vez. El tope no es estético: son los únicos
 * elementos que se redibujan en cada fotograma, y con treinta y dos la cuenta
 * sale igual en un portátil viejo que en uno nuevo.
 */
const MAX_PULSES = 32;

/** Fotogramas por segundo del recorrido. Más no se distingue y gasta batería. */
const FRAME_MS = 33;

/**
 * La estela: la cabeza del pulso y dos pasos detrás, cada uno más apagado.
 * Sin ella el pulso es un punto que salta; con ella se ve hacia dónde va, que
 * es lo único que un diagrama de flujo tiene que decir.
 */
const TRAIL = [0, 0.018, 0.036];

/**
 * La tela, con sitio propio, y con dos maneras de leer el mismo grafo.
 *
 * 1. **Se reteje.** Pulsar un nodo lo pone en el centro y deja en sombra todo
 *    lo que no sea vecino suyo. Cada navegación es un tejido nuevo, y con
 *    doscientas entradas ésta será la única manera de leer el grafo.
 * 2. **Tiene dos pieles.** `tela` curva los hilos como seda y está quieta.
 *    `flujo` los quiebra en ángulo recto sobre una rejilla y **se mueve**: por
 *    las trazas más fuertes viaja un pulso, y el nodo del centro respira. El
 *    grafo es el mismo y los puntos no se mueven de sitio entre una piel y
 *    otra; lo que cambia es la mano que lo dibuja.
 * 3. **Deja pasar a los mapas.** Las tres lecturas de `/deriva` se abren desde
 *    aquí, que es donde uno ya está mirando la red.
 *
 * Sobre el movimiento: `CLAUDE.md` deja un solo momento de movimiento en toda
 * la interfaz, y esto es una excepción pedida expresamente. Queda acotada a
 * esta piel, no usa más color que el acento que el proyecto ya tenía, y se
 * apaga entera con `prefers-reduced-motion`. Y cumple la regla de la sección 9
 * del handoff: **si el bucle no corre, el diagrama está igualmente dibujado**.
 * Lo que falta entonces es el viaje, no la información.
 *
 * Lo que no cambia en ninguna piel: la posición la manda la pata. No es un
 * layout de fuerzas y no debe serlo.
 */
export function Tejido({
  corpus,
  focus,
  skin,
  size,
  reduceMotion,
  onFocus,
  onOpen,
  onOpenTools,
  toolsOpen,
}: Props) {
  const web = useMemo(
    () => buildWeb(corpus.entries, corpus.categories, SEED, RING, MIN_WEIGHT),
    [corpus.entries, corpus.categories],
  );
  const [hovered, setHovered] = useState<Node | null>(null);
  const [thread, setThread] = useState<Edge | null>(null);
  const [clock, setClock] = useState(0);

  const moving = skin === 'flujo' && !reduceMotion;

  /**
   * El reloj del circuito. Solo existe mientras hay algo que mover: con la
   * piel de seda o con reducción de movimiento no se monta, y en una pestaña
   * de fondo no corre porque `requestAnimationFrame` no dispara ahí.
   */
  useEffect(() => {
    if (!moving || typeof window === 'undefined') return;
    let frame = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        setClock((now - start) / 1000);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [moving]);

  const centre = focus ? (corpus.entries.find((entry) => entry.id === focus) ?? null) : null;
  const barrio = useMemo(
    () => (centre ? withinSteps(centre, corpus.entries, DEPTH) : null),
    [centre, corpus.entries],
  );

  const byId = useMemo(() => new Map(web.nodes.map((node) => [node.id, node])), [web]);
  const P = (v: number) => v * size;
  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name;

  /**
   * Cuánto pesa cada entrada en el tejido actual. Lo que está fuera del barrio
   * sigue dibujado y sigue pulsándose: apagarlo del todo dejaría la tela sin
   * salida, y lo que se quiere es poder saltar lejos.
   */
  const weight = (id: string): number => {
    if (!barrio) return 1;
    const steps = barrio.get(id);
    return steps === 0 ? 1 : steps === 1 ? 0.85 : GHOST;
  };

  const visibles = useMemo(
    () => web.edges.filter((edge) => Math.min(weight(edge.from), weight(edge.to)) > GHOST),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [web, focus],
  );

  /** La traza de cada hilo visible, en coordenadas 0..1. Se calcula una vez. */
  const rutas = useMemo(() => {
    const out = new Map<string, Vertex[]>();
    for (const edge of visibles) {
      const a = byId.get(edge.from);
      const b = byId.get(edge.to);
      if (!a || !b) continue;
      out.set(`${edge.from}|${edge.to}`, traceRoute(a, b, `${edge.from}|${edge.to}`));
    }
    return out;
  }, [visibles, byId]);

  const trazo = (edge: Edge): string | null => {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) return null;
    if (skin === 'flujo') {
      const ruta = rutas.get(`${edge.from}|${edge.to}`);
      if (!ruta) return null;
      return ruta.map((v, i) => `${i === 0 ? 'M' : 'L'} ${P(v.x)} ${P(v.y)}`).join(' ');
    }
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return `M ${P(a.x)} ${P(a.y)} Q ${P(mx + (0.5 - mx) * 0.35)} ${P(my + (0.5 - my) * 0.35)} ${P(b.x)} ${P(b.y)}`;
  };

  const lejanos = useMemo(() => farCrossings(web, RING), [web]);

  /**
   * La rejilla: el suelo del laberinto. Solo en flujo, y solo insinuada; si se
   * leyera más que las trazas dejaría de ser suelo y pasaría a ser ruido.
   */
  const rejilla = useMemo(() => {
    if (skin !== 'flujo') return null;
    const lineas = [];
    for (let i = 2; i < 22; i += 2) {
      const v = i * TRACE_GRID * size;
      lineas.push(
        <Line key={`v${i}`} x1={v} y1={0} x2={v} y2={size} stroke={colors.line} strokeWidth={1} opacity={0.5} />,
        <Line key={`h${i}`} x1={0} y1={v} x2={size} y2={v} stroke={colors.line} strokeWidth={1} opacity={0.5} />,
      );
    }
    return lineas;
  }, [skin, size]);

  /**
   * Los hilos se calculan aparte y solo cuando cambia algo que les afecte. Son
   * casi trescientos, más otros tantos blancos de pulsación: si se rehicieran
   * en cada fotograma del circuito, mover un pulso costaría seiscientos nodos
   * de SVG.
   */
  const hilos = useMemo(
    () =>
      visibles.map((edge) => {
        const d = trazo(edge);
        if (!d) return null;
        const fuerza = Math.min(weight(edge.from), weight(edge.to));
        const elegido = thread?.from === edge.from && thread?.to === edge.to;
        // El trazo lo decide la razón del vínculo, nunca el color.
        const estilo = THREAD_STYLE[edge.reason];
        // En seda los hilos son fondo y la entrada es lo que se lee. En flujo
        // el dibujo *es* el contenido, así que la pista sube de tono.
        const circuito = skin === 'flujo';
        return (
          <Path
            key={`${edge.from}|${edge.to}`}
            d={d}
            fill="none"
            stroke={elegido ? colors.text : circuito ? colors.dim : colors.line}
            strokeWidth={(elegido ? 1.6 : 0.4 + edge.weight * 1.1) * estilo.weight}
            strokeDasharray={estilo.dash ?? undefined}
            opacity={(elegido ? 0.95 : (circuito ? 0.34 : 0.3) + edge.weight * 0.4) * fuerza}
          />
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibles, rutas, skin, thread, size],
  );

  const vias = useMemo(() => {
    if (skin !== 'flujo') return [];
    const puntos = new Map<string, Vertex>();
    for (const ruta of rutas.values()) {
      for (const codo of ruta.slice(1, -1)) {
        puntos.set(`${codo.x.toFixed(4)}|${codo.y.toFixed(4)}`, codo);
      }
    }
    return [...puntos.values()];
  }, [rutas, skin]);

  const blancos = useMemo(
    () =>
      visibles.map((edge) => {
        const d = trazo(edge);
        if (!d) return null;
        return (
          <Path
            key={`hit|${edge.from}|${edge.to}`}
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            onPress={() => setThread((current) => (current === edge ? null : edge))}
          />
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibles, rutas, skin, size],
  );

  /**
   * Por dónde corre la corriente: las trazas más fuertes del tejido actual.
   * Cada una lleva su pulso con una fase propia y una velocidad proporcional a
   * la fuerza del vínculo, así que un vínculo anotado a mano se recorre antes
   * que una coincidencia de tipo. **El movimiento también dice algo.** Nada de
   * esto es azar suelto: la fase sale del PRNG sembrado con los dos extremos.
   */
  const corriente = useMemo(() => {
    if (skin !== 'flujo') return [];
    return [...visibles]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_PULSES)
      .map((edge) => {
        const key = `${edge.from}|${edge.to}`;
        const ruta = rutas.get(key);
        if (!ruta) return null;
        const rng = rngFromString(`pulso:${key}`);
        return {
          key,
          ruta,
          fase: rng(),
          velocidad: 0.06 + edge.weight * 0.14,
          fuerza: Math.min(weight(edge.from), weight(edge.to)),
        };
      })
      .filter((pulso): pulso is NonNullable<typeof pulso> => pulso !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles, rutas, skin]);

  // El latido del nodo del centro: lento, y de una sola propiedad.
  const latido = moving ? 1 + Math.sin(clock * 1.6) * 0.16 : 1;
  const centreNode = centre ? byId.get(centre.id) : null;

  return (
    <View>
      {onOpenTools ? (
        <View style={styles.barra}>
          <Text style={styles.barraTexto}>
            {skin === 'flujo' ? 'flujo · trazas en ángulo recto, con corriente' : 'tela · hilos curvos, quietos'}
          </Text>
          <ToolButton
            label="instrumento"
            expanded={toolsOpen}
            onPress={onOpenTools}
            hint="pieles, foco y los tres mapas"
          />
        </View>
      ) : null}

      <View style={[styles.canvas, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {rejilla}
          <Circle
            cx={P(0.5)}
            cy={P(0.5)}
            r={P(0.47)}
            fill="none"
            stroke={colors.line}
            strokeWidth={1}
            opacity={skin === 'flujo' ? 0.35 : 1}
          />
          {hilos}
          {vias.map((via) => (
            <Rect
              key={`via${via.x.toFixed(4)}|${via.y.toFixed(4)}`}
              x={P(via.x) - 1}
              y={P(via.y) - 1}
              width={2}
              height={2}
              fill={colors.line}
              opacity={0.9}
            />
          ))}
          {blancos}

          {/* La corriente va encima de las trazas y debajo de los nodos: un
              pulso pasa por la pista, no por delante de la entrada. */}
          {corriente.map((pulso) => {
            const t = (pulso.fase + clock * pulso.velocidad) % 1;
            // Se apaga al entrar y al salir, para que no aparezca de la nada.
            const borde = Math.min(1, Math.min(t, 1 - t) * 8);
            return TRAIL.map((atras, i) => {
              const punto = pointOnRoute(pulso.ruta, t - atras);
              const lado = i === 0 ? 4 : 3 - i;
              return (
                <Rect
                  key={`pulso|${pulso.key}|${i}`}
                  x={P(punto.x) - lado / 2}
                  y={P(punto.y) - lado / 2}
                  width={lado}
                  height={lado}
                  fill={colors.accent}
                  opacity={(i === 0 ? 1 : 0.4 / i) * borde * pulso.fuerza}
                />
              );
            });
          })}

          {web.nodes.map((node) => {
            const fuerza = weight(node.id);
            const centred = node.id === focus;
            const r = 2 + Math.min(4, node.degree / 7) + (centred ? 3 : 0);
            const grande = hovered?.id === node.id ? r + 2 : r;
            // En flujo los nodos son cuadrados: una placa no tiene gotas.
            return skin === 'flujo' ? (
              <Rect
                key={node.id}
                x={P(node.x) - grande}
                y={P(node.y) - grande}
                width={grande * 2}
                height={grande * 2}
                fill={centred || node.unverified ? colors.bg : colors.dim}
                opacity={fuerza}
                stroke={node.unverified ? colors.accent : centred ? colors.text : 'none'}
                strokeWidth={node.unverified || centred ? 1 : 0}
              />
            ) : (
              <Circle
                key={node.id}
                cx={P(node.x)}
                cy={P(node.y)}
                r={grande}
                fill={centred ? colors.text : node.unverified ? colors.bg : colors.dim}
                opacity={fuerza}
                stroke={node.unverified ? colors.accent : 'none'}
                strokeWidth={node.unverified ? 1 : 0}
              />
            );
          })}

          {/* El nodo del centro respira: cuatro escuadras que se abren y se
              cierran. Es lo único que dice «esto está encendido» sin escribirlo. */}
          {skin === 'flujo' && centreNode
            ? [
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ].map(([sx, sy]) => {
                const half = 10 * latido;
                const brazo = 4;
                const x = P(centreNode.x);
                const y = P(centreNode.y);
                return (
                  <Path
                    key={`escuadra${sx}${sy}`}
                    d={`M ${x + sx * half - sx * brazo} ${y + sy * half} L ${x + sx * half} ${y + sy * half} L ${x + sx * half} ${y + sy * half - sy * brazo}`}
                    fill="none"
                    stroke={colors.text}
                    strokeWidth={1}
                    opacity={0.7}
                  />
                );
              })
            : null}
        </Svg>

        {web.nodes.map((node) => (
          <Pressable
            key={node.id}
            accessibilityRole="button"
            accessibilityLabel={node.title}
            accessibilityHint={
              node.id === focus ? 'ya está en el centro; abajo se abre la entrada' : 'teje la red a su alrededor'
            }
            onPress={() => onFocus(node.id === focus ? null : node.id)}
            onHoverIn={() => setHovered(node)}
            onHoverOut={() => setHovered((current) => (current?.id === node.id ? null : current))}
            style={[styles.hit, { left: P(node.x) - 14, top: P(node.y) - 14 }]}
          />
        ))}
      </View>

      <Text style={styles.legend} numberOfLines={2}>
        {thread
          ? `${byId.get(thread.from)?.title} — ${byId.get(thread.to)?.title} · por ${linkText(
              { to: thread.to, score: 0, reason: thread.reason, label: thread.label },
              categoryName,
            )}`
          : hovered
            ? `${catalogId(hovered.id)} · ${hovered.title} · ${hovered.degree} vínculos`
            : barrio
              ? `${barrio.size - 1} vecinos directos · el resto queda en sombra, no borrado`
              : `${web.nodes.length} entradas · ${visibles.length} hilos · ${lejanos.length} cruzan el anillo`}
      </Text>

      {centre ? (
        <View style={styles.block}>
          <Text style={styles.centreTitle}>{centre.title}</Text>
          <Text style={styles.centreMeta}>
            {catalogId(centre.id)} · {neighbours(centre, corpus.entries).length} vínculos
          </Text>
          <View style={styles.controls}>
            <Chip label="abrir la entrada" on={false} onPress={() => onOpen(centre.id)} />
          </View>
        </View>
      ) : null}

    </View>
  );
}

/**
 * El instrumento de la tela: con qué mano se dibuja el grafo y hacia dónde se
 * sale de él.
 *
 * La clave del trazo vive aquí y no bajo el dibujo porque es lo mismo que la
 * leyenda del Atlas: dice cómo leer lo que se está mirando, y cambia con la
 * piel. Los tres mapas se abren desde aquí, que es donde uno ya está mirando
 * la red.
 */
export function TelaAside({ skin, focus, onSkin, onFocus, onMap }: AsideProps) {
  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.label}>la tela</Text>
        <Text style={[styles.state, focus ? styles.stateOn : null]}>{focus ? 'tejida' : 'entera'}</Text>
      </View>

      <Text style={styles.asideLabel}>la piel</Text>
      <View style={styles.controls}>
        <Chip label="tela" on={skin === 'tela'} onPress={() => onSkin('tela')} hint="hilos curvos, como seda" />
        <Chip
          label="flujo"
          on={skin === 'flujo'}
          onPress={() => onSkin('flujo')}
          hint="trazas en ángulo recto, con la corriente en movimiento"
        />
      </View>

      <Text style={styles.key}>
        continuo, lo que el archivo declara · discontinuo, la misma pata · punteado, el mismo tipo
        {skin === 'flujo' ? ' · la corriente corre más deprisa por el vínculo más fuerte' : ''}
      </Text>

      {focus ? (
        <View style={styles.block}>
          <Text style={styles.asideLabel}>el foco</Text>
          <View style={styles.controls}>
            <Chip label="el archivo entero" on={false} onPress={() => onFocus(null)} hint="deshace el tejido" />
          </View>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.asideLabel}>mapas</Text>
        <View style={styles.controls}>
          <Chip label="deriva" on={false} onPress={() => onMap('deriva')} hint="una cadena y la razón de cada paso" />
          <Chip label="dos mundos" on={false} onPress={() => onMap('dos-mundos')} hint="la antípoda de una pata" />
          <Chip label="distancia" on={false} onPress={() => onMap('distancia')} hint="el diámetro de la red" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { alignSelf: 'center' },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.xs,
  },
  barraTexto: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.dim,
  },
  hit: { position: 'absolute', width: 28, height: 28 },
  legend: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.sm,
  },
  key: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.72,
    lineHeight: 17,
    color: colors.dim,
    marginTop: space.sm,
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  block: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },

  // La columna del instrumento habla en versales y en mono, como las patas.
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  asideLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  state: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.dim },
  stateOn: { color: machine },
  centreTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 29,
    color: colors.text,
  },
  centreMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: 2,
  },
});
