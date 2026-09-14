import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { legAngle, RING } from '../../lib/aleph/tension';
import type { LegState } from '../../lib/content/corpus';
import { useFocusRing } from '../hooks/useFocusRing';
import { firstWords, legHint } from '../lib/copy';
import { textGlyph } from '../lib/glyph';
import { colors, fonts, HIT_SIZE, space } from '../theme';
import { Sigil } from './Sigil';

type Props = {
  legs: LegState[];
  selected: readonly string[];
  /** Lado del cuadro, en píxeles. */
  size: number;
  /** Dónde cuelga la araña dentro del cuadro, en 0..1. */
  center: { x: number; y: number };
  onToggle: (id: string) => void;
};

/** Radio del anillo, en fracción del lado. */
const RADIUS = 0.43;

/**
 * Las once patas en órbita.
 *
 * Hasta aquí las categorías eran una lista a un lado y la araña un dibujo al
 * otro, así que la metáfora había que leerla en la documentación. Puestas en
 * el ángulo que `legAngle` ya calculaba para la física, la pantalla dice sola
 * lo que el proyecto es: **apoyar una pata es tirar del animal**.
 *
 * El orden del anillo es afinidad, no alfabeto: dos patas vecinas cruzan bien
 * y dos opuestas cruzan mal, y eso ya lo usan la tela y los dos mundos. Aquí
 * se ve. Apoyar una tensa su hilo hacia el centro; nada se mueve al hacerlo,
 * porque el único momento de movimiento de la interfaz es la aparición.
 */
export function LegRing({ legs, selected, size, center, onToggle }: Props) {
  const [hovered, setHovered] = useState<LegState | null>(null);
  const P = (v: number) => v * size;
  const cx = P(center.x);
  const cy = P(center.y);

  const at = (leg: number) => {
    const angle = legAngle(leg, RING);
    return { x: cx + Math.cos(angle) * P(RADIUS), y: cy + Math.sin(angle) * P(RADIUS) };
  };

  const shown = hovered ?? null;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {/* Los hilos, debajo de todo: una pata apoyada tira del centro. */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        {legs.map((leg) => {
          const on = selected.includes(leg.category.id);
          if (!on && shown?.category.id !== leg.category.id) return null;
          const p = at(leg.category.leg);
          // La holgura va en perpendicular a la cuerda: un hilo tirante no es
          // una recta, y curvarlo hacia el centro no curvaría nada.
          const mx = (p.x + cx) / 2;
          const my = (p.y + cy) / 2;
          const nx = -(cy - p.y);
          const ny = cx - p.x;
          const norm = Math.hypot(nx, ny) || 1;
          const sag = on ? P(0.02) : P(0.05);
          return (
            <Path
              key={leg.category.id}
              d={`M ${p.x} ${p.y} Q ${mx + (nx / norm) * sag} ${my + (ny / norm) * sag} ${cx} ${cy}`}
              fill="none"
              stroke={on ? colors.text : colors.line}
              strokeWidth={on ? 1 : StyleSheet.hairlineWidth * 2}
              opacity={on ? 0.7 : 0.5}
            />
          );
        })}
      </Svg>

      {legs.map((leg) => {
        const p = at(leg.category.leg);
        const on = selected.includes(leg.category.id);
        return (
          <LegNode
            key={leg.category.id}
            leg={leg}
            selected={on}
            hovered={shown?.category.id === leg.category.id}
            left={p.x - HIT_SIZE / 2}
            top={p.y - HIT_SIZE / 2}
            onPress={() => onToggle(leg.category.id)}
            onHover={(enter) =>
              setHovered((current) => (enter ? leg : current?.category.id === leg.category.id ? null : current))
            }
          />
        );
      })}

      {/* Una sola línea al pie: el nombre de lo que se está mirando. Sin
          globos flotantes, que taparían la araña justo al acercarse a ella. */}
      <Text style={styles.caption} numberOfLines={2}>
        {shown
          ? `${shown.category.name} · ${shown.visible ? `${shown.count} entradas` : `faltan ${shown.missing}`} · ${firstWords(shown.category.description, 6)}`
          : selected.length === 0
            ? 'apoya una pata, o pulsa la araña'
            : `${selected.length} ${selected.length === 1 ? 'pata apoyada' : 'patas apoyadas'}`}
      </Text>
    </View>
  );
}

type NodeProps = {
  leg: LegState;
  selected: boolean;
  hovered: boolean;
  left: number;
  top: number;
  onPress: () => void;
  onHover: (enter: boolean) => void;
};

function LegNode({ leg, selected, hovered, left, top, onPress, onHover }: NodeProps) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const strong = selected || hovered;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={leg.category.name}
      accessibilityHint={legHint(leg.count, leg.visible, leg.missing, selected)}
      accessibilityState={{ disabled: !leg.visible, selected }}
      disabled={!leg.visible}
      onPress={onPress}
      onHoverIn={() => onHover(true)}
      onHoverOut={() => onHover(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={({ pressed }) => [
        styles.node,
        { left, top },
        !leg.visible && styles.retracted,
        pressed && styles.pressed,
        focusVisible && styles.focus,
      ]}
    >
      <View style={styles.sigil} pointerEvents="none">
        <Sigil leg={leg.category.leg} size={HIT_SIZE} hollow strong={strong} />
      </View>
      <Text style={[styles.glyph, strong && styles.on]} maxFontSizeMultiplier={1.2}>
        {textGlyph(leg.category.glyph)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0 },
  node: {
    position: 'absolute',
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    outlineWidth: 0,
  },
  sigil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  glyph: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
    color: colors.dim,
    textAlign: 'center',
  },
  on: { color: colors.text },
  retracted: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  focus: { outlineColor: colors.accent, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    color: colors.dim,
    paddingHorizontal: space.sm,
  },
});
