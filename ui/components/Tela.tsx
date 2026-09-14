import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { RING } from '../../lib/aleph/tension';
import type { Corpus } from '../../lib/content/corpus';
import { buildWeb, farCrossings, type Edge, type Node } from '../../lib/drift/layout';
import { catalogId } from '../../lib/labels';
import { linkText } from '../lib/copy';
import { THREAD_STYLE } from '../lib/epistemic';
import { colors, fonts, space } from '../theme';

type Props = {
  corpus: Corpus;
  seed: string;
  /** Lado del cuadro, en píxeles. */
  size: number;
  /** Entradas que la invocación puso en juego: se dibujan encendidas. */
  lit?: readonly string[];
  /** La lista de cruces lejanos solo cabe en la tela grande. */
  showCrossings?: boolean;
  /**
   * Fondo: la tela se dibuja tenue, sin leyenda, sin lista y sin blancos
   * táctiles. Deja de ser una sección y pasa a ser el sitio donde ocurre
   * todo lo demás.
   */
  ambient?: boolean;
  onOpen: (id: string) => void;
};

/**
 * La tela.
 *
 * El grafo llevaba desde la fase 0 calculándose en `lib/drift/graph.ts` y solo
 * se veía en forma de lista. Aquí se dibuja, y se dibuja sobre el anillo de las
 * once patas: cada entrada cae en el sector de su categoría, así que la
 * posición no es decorativa. Dos entradas próximas comparten pata; una arista
 * que atraviesa el centro une dos patas lejanas, y el orden del anillo es
 * afinidad. **Un hilo largo es un cruce improbable**, que es exactamente lo que
 * el archivo existe para producir.
 *
 * Sin librería de grafos y sin layout de fuerzas: un layout de fuerzas
 * ordenaría los puntos por una física que no significa nada aquí.
 */
export function Tela({ corpus, seed, size, lit = [], showCrossings = true, ambient = false, onOpen }: Props) {
  const web = useMemo(
    () => buildWeb(corpus.entries, corpus.categories, seed, RING),
    [corpus.entries, corpus.categories, seed],
  );
  const lejanos = useMemo(() => farCrossings(web, RING), [web]);
  const [hovered, setHovered] = useState<Node | null>(null);
  // El hilo que se ha pulsado: un grafo debe poder decir por qué une lo que une.
  const [thread, setThread] = useState<Edge | null>(null);

  const encendidas = new Set(lit);
  const byId = new Map(web.nodes.map((n) => [n.id, n]));
  const P = (v: number) => v * size;
  // De fondo, la tela baja casi hasta desaparecer: se intuye, no se lee.
  const alpha = ambient ? 0.26 : 1;

  const destacada = (edge: Edge) =>
    encendidas.has(edge.from) && encendidas.has(edge.to);
  const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name;

  return (
    <View>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* El anillo, apenas insinuado: es la referencia, no el dibujo. */}
          <Circle
            cx={P(0.5)}
            cy={P(0.5)}
            r={P(0.47)}
            fill="none"
            stroke={colors.line}
            strokeWidth={1}
            opacity={alpha}
          />
          {web.edges.map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            if (!a || !b) return null;
            // Los hilos se curvan hacia el centro: una tela no tiene cuerdas
            // rectas, y la curva deja ver cuál de dos hilos paralelos es cuál.
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const cx = mx + (0.5 - mx) * 0.35;
            const cy = my + (0.5 - my) * 0.35;
            const fuerte = destacada(edge);
            const elegido = thread?.from === edge.from && thread?.to === edge.to;
            // El trazo lo decide la razón del vínculo, no solo su peso: un hilo
            // anotado a mano y una coincidencia de tipo no afirman lo mismo.
            const estilo = THREAD_STYLE[edge.reason];
            const trazo = `M ${P(a.x)} ${P(a.y)} Q ${P(cx)} ${P(cy)} ${P(b.x)} ${P(b.y)}`;
            const visible = fuerte || elegido;
            return (
              <Path
                key={`${edge.from}|${edge.to}`}
                d={trazo}
                fill="none"
                stroke={visible ? colors.text : colors.line}
                strokeWidth={(visible ? 1.6 : 0.4 + edge.weight * 1.1) * estilo.weight}
                strokeDasharray={estilo.dash ?? undefined}
                opacity={(visible ? 0.95 : 0.3 + edge.weight * 0.4) * alpha}
              />
            );
          })}
          {(ambient ? [] : web.edges).map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <Path
                key={`hit|${edge.from}|${edge.to}`}
                d={`M ${P(a.x)} ${P(a.y)} Q ${P(mx + (0.5 - mx) * 0.35)} ${P(my + (0.5 - my) * 0.35)} ${P(b.x)} ${P(b.y)}`}
                fill="none"
                stroke="transparent"
                strokeWidth={10}
                onPress={() => setThread((c) => (c === edge ? null : edge))}
              />
            );
          })}
          {web.nodes.map((node) => {
            const on = encendidas.has(node.id);
            const r = 2 + Math.min(4, node.degree / 7);
            return (
              <Circle
                key={node.id}
                cx={P(node.x)}
                cy={P(node.y)}
                r={hovered?.id === node.id ? r + 2 : r}
                fill={on ? colors.text : node.unverified ? colors.bg : colors.dim}
                opacity={on ? 1 : alpha}
                stroke={node.unverified ? colors.accent : 'none'}
                strokeWidth={node.unverified ? 1 : 0}
              />
            );
          })}
        </Svg>

        {/* Las áreas táctiles van encima del SVG: así el punto puede ser
            pequeño y el blanco seguir siendo grande. De fondo no hay ninguna:
            la tela no debe robarle clics al texto. */}
        {(ambient ? [] : web.nodes).map((node) => (
          <Pressable
            key={node.id}
            accessibilityRole="link"
            accessibilityLabel={node.title}
            accessibilityHint={`${node.degree} vínculos. abre la entrada`}
            onPress={() => onOpen(node.id)}
            onHoverIn={() => setHovered(node)}
            onHoverOut={() => setHovered((c) => (c?.id === node.id ? null : c))}
            style={[styles.hit, { left: P(node.x) - 14, top: P(node.y) - 14 }]}
          />
        ))}
      </View>

      {ambient ? null : (
      <Text style={styles.legend} numberOfLines={2}>
        {thread
          ? `${byId.get(thread.from)?.title} — ${byId.get(thread.to)?.title} · por ${linkText(
              { to: thread.to, score: 0, reason: thread.reason, label: thread.label },
              categoryName,
            )}`
          : hovered
            ? `${catalogId(hovered.id)} · ${hovered.title} · ${hovered.degree} vínculos`
            : `${web.nodes.length} entradas · ${web.edges.length} hilos · ${lejanos.length} cruzan el anillo · pulsa un hilo`}
      </Text>
      )}

      {showCrossings && !ambient ? (
        <Text style={styles.key} numberOfLines={2}>
          continuo, lo que el archivo declara · discontinuo, la misma pata · punteado, el mismo tipo
        </Text>
      ) : null}

      {showCrossings && !ambient && lejanos.length > 0 ? (
        <View style={styles.far}>
          <Text style={styles.farLabel}>los cruces más lejanos</Text>
          {lejanos.slice(0, 3).map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            if (!a || !b) return null;
            return (
              <Text key={`${edge.from}|${edge.to}`} style={styles.farRow} numberOfLines={2}>
                {a.title} — {b.title}
                <Text style={styles.farWhy}>{`  ·  ${edge.span} patas de distancia`}</Text>
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', width: 28, height: 28 },
  // La leyenda de la gramática: sin ella, el trazo distinto es solo ruido.
  key: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.xs,
  },
  legend: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.sm,
  },
  far: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
  },
  farLabel: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
    marginBottom: space.xs,
  },
  farRow: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 2,
  },
  farWhy: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    lineHeight: 18,
    color: colors.dim,
  },
});
