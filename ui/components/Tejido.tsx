import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { RING } from '../../lib/aleph/tension';
import type { Corpus } from '../../lib/content/corpus';
import { neighbours, withinSteps } from '../../lib/drift/graph';
import { buildWeb, farCrossings, type Edge, type Node } from '../../lib/drift/layout';
import type { DriftMode, WebSkin } from '../../lib/drift/modes';
import { catalogId } from '../../lib/labels';
import { useFocusRing } from '../hooks/useFocusRing';
import { linkText } from '../lib/copy';
import { THREAD_STYLE } from '../lib/epistemic';
import { colors, fonts, HIT_SIZE, space } from '../theme';

type Props = {
  corpus: Corpus;
  /** Entrada en el centro del tejido, o null para el archivo entero. */
  focus: string | null;
  skin: WebSkin;
  size: number;
  onFocus: (id: string | null) => void;
  onSkin: (skin: WebSkin) => void;
  onOpen: (id: string) => void;
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
 * La tela, con sitio propio.
 *
 * Tres cosas que no hacía cuando vivía al fondo de la portada:
 *
 * 1. **Se reteje.** Pulsar un nodo lo pone en el centro y deja en sombra todo
 *    lo que no sea vecino suyo. Cada navegación es un tejido nuevo, y con
 *    doscientas entradas ésta será la única manera de leer el grafo.
 * 2. **Tiene dos pieles.** `tela` curva los hilos como seda; `flujo` los
 *    quiebra en ángulo recto, como la traza de una placa. El grafo es el
 *    mismo y las posiciones no se mueven: cambia la mano que lo dibuja.
 * 3. **Deja pasar a los mapas.** Las tres lecturas de `/deriva` se abren desde
 *    aquí, que es donde uno ya está mirando la red.
 *
 * Lo que no cambia: la posición la manda la pata. No es un layout de fuerzas
 * y no debe serlo.
 */
export function Tejido({ corpus, focus, skin, size, onFocus, onSkin, onOpen, onMap }: Props) {
  const web = useMemo(
    () => buildWeb(corpus.entries, corpus.categories, SEED, RING, MIN_WEIGHT),
    [corpus.entries, corpus.categories],
  );
  const [hovered, setHovered] = useState<Node | null>(null);
  const [thread, setThread] = useState<Edge | null>(null);

  const centre = focus ? (corpus.entries.find((entry) => entry.id === focus) ?? null) : null;
  const barrio = useMemo(
    () => (centre ? withinSteps(centre, corpus.entries, DEPTH) : null),
    [centre, corpus.entries],
  );

  const byId = new Map(web.nodes.map((node) => [node.id, node]));
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

  /** El hilo entre dos puntos, según la piel. */
  const path = (a: Node, b: Node): string => {
    if (skin === 'flujo') {
      // Dos tramos rectos y una esquina: la traza no diagonaliza nunca.
      return `M ${P(a.x)} ${P(a.y)} L ${P(a.x)} ${P(b.y)} L ${P(b.x)} ${P(b.y)}`;
    }
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return `M ${P(a.x)} ${P(a.y)} Q ${P(mx + (0.5 - mx) * 0.35)} ${P(my + (0.5 - my) * 0.35)} ${P(b.x)} ${P(b.y)}`;
  };

  const visibles = web.edges.filter((edge) => Math.min(weight(edge.from), weight(edge.to)) > GHOST);
  const lejanos = useMemo(() => farCrossings(web, RING), [web]);

  return (
    <View>
      <View style={[styles.canvas, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={P(0.5)}
            cy={P(0.5)}
            r={P(0.47)}
            fill="none"
            stroke={colors.line}
            strokeWidth={1}
            opacity={skin === 'flujo' ? 0.35 : 1}
          />
          {visibles.map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            if (!a || !b) return null;
            const fuerza = Math.min(weight(edge.from), weight(edge.to));
            const elegido = thread?.from === edge.from && thread?.to === edge.to;
            // El trazo lo decide la razón del vínculo, nunca el color.
            const estilo = THREAD_STYLE[edge.reason];
            return (
              <Path
                key={`${edge.from}|${edge.to}`}
                d={path(a, b)}
                fill="none"
                stroke={elegido ? colors.text : colors.line}
                strokeWidth={(elegido ? 1.6 : 0.4 + edge.weight * 1.1) * estilo.weight}
                strokeDasharray={estilo.dash ?? undefined}
                opacity={(elegido ? 0.95 : 0.3 + edge.weight * 0.4) * fuerza}
              />
            );
          })}
          {visibles.map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            if (!a || !b) return null;
            return (
              <Path
                key={`hit|${edge.from}|${edge.to}`}
                d={path(a, b)}
                fill="none"
                stroke="transparent"
                strokeWidth={10}
                onPress={() => setThread((current) => (current === edge ? null : edge))}
              />
            );
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

      <View style={styles.controls}>
        <Chip label="tela" on={skin === 'tela'} onPress={() => onSkin('tela')} hint="hilos curvos, como seda" />
        <Chip label="flujo" on={skin === 'flujo'} onPress={() => onSkin('flujo')} hint="hilos en ángulo recto" />
        {focus ? <Chip label="el archivo entero" on={false} onPress={() => onFocus(null)} /> : null}
      </View>

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

      <Text style={styles.key} numberOfLines={2}>
        continuo, lo que el archivo declara · discontinuo, la misma pata · punteado, el mismo tipo
      </Text>

      <View style={styles.block}>
        <Text style={styles.label}>mapas</Text>
        <View style={styles.controls}>
          <Chip label="deriva" on={false} onPress={() => onMap('deriva')} hint="una cadena y la razón de cada paso" />
          <Chip label="dos mundos" on={false} onPress={() => onMap('dos-mundos')} hint="la antípoda de una pata" />
          <Chip label="distancia" on={false} onPress={() => onMap('distancia')} hint="el diámetro de la red" />
        </View>
      </View>
    </View>
  );
}

function Chip({ label, on, onPress, hint }: { label: string; on: boolean; onPress: () => void; hint?: string }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.chip, on && styles.chipOn, focusVisible && styles.focus]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canvas: { alignSelf: 'center' },
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
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.sm,
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  block: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
  },
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
  chip: {
    minHeight: HIT_SIZE,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  chipOn: { borderColor: colors.text },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
  },
  chipTextOn: { color: colors.text },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
