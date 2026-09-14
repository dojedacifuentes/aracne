import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Ellipse, G, Line, Polyline } from 'react-native-svg';

import { alephState, RING } from '../../../lib/aleph/tension';
import { colors, NATIVE_DRIVER } from '../../theme';
import { MOTION, SCENE, type SpiderOptions } from './spiderConfig';

type Props = {
  width: number;
  height: number;
  options: SpiderOptions;
  legs: readonly number[];
  ringSize: number;
  reduceMotion: boolean;
  pressToken: number;
};

/** Patas del lado derecho, en una caja de 100 × 100, cabeza abajo. El izquierdo es su espejo. */
const RIGHT_LEGS = [
  '55,60 70,66 78,88',
  '56,57 74,55 88,68',
  '56,53 74,45 88,33',
  '54,49 68,34 74,12',
];

const mirror = (points: string) =>
  points
    .split(' ')
    .map((pair) => {
      const [x, y] = pair.split(',');
      return `${100 - Number(x)},${y}`;
    })
    .join(' ');

/**
 * La araña cuando no hay 3D: en nativo, sin WebGL o si el modelo no carga.
 * Aplica exactamente el mismo desplazamiento que la escena con un
 * `translate`, y el mismo gesto de pupila. Una silueta que se descuelga sigue
 * diciendo lo mismo que un modelo que se descuelga.
 */
export function SpiderFallback({ width, height, options, legs, ringSize, reduceMotion, pressToken }: Props) {
  const span = Math.min(width, height) * SCENE.span * options.scale;
  const restX = options.position[0] * width;
  const restY = options.position[1] * height;
  const unit = span * 0.5 * MOTION.tensionReach;

  const pull = useMemo(() => alephState([...legs], { legs: ringSize, reach: RING.reach }).offset, [legs, ringSize]);
  const [offset] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const to = { x: pull.x * unit, y: pull.y * unit };
    if (reduceMotion) {
      offset.setValue(to);
      return;
    }
    const animation = Animated.spring(offset, {
      toValue: to,
      stiffness: 90,
      damping: 14,
      mass: 1,
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [pull.x, pull.y, unit, reduceMotion, offset]);

  useEffect(() => {
    if (pressToken === 0 || reduceMotion) return;
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: MOTION.pressScale,
        duration: MOTION.pressMs * 0.4,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: MOTION.pressMs * 0.6,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [pressToken, reduceMotion, scale]);

  if (!options.visible || width === 0 || height === 0) return null;

  // Hasta dónde sube el hilo, en unidades de la caja de la silueta.
  const threadTop = -((restY + span) / span) * 100;

  return (
    <Animated.View
      style={[
        styles.spider,
        {
          left: restX - span / 2,
          top: restY - span / 2,
          width: span,
          height: span,
          transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.svg}>
        {options.silk ? (
          <Line
            x1={50}
            y1={threadTop}
            x2={50}
            y2={27}
            stroke={colors.text}
            strokeOpacity={options.silkOpacity}
            strokeWidth={0.6}
          />
        ) : null}
        <G stroke={colors.dim} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {RIGHT_LEGS.map((points) => (
            <Polyline key={points} points={points} />
          ))}
          {RIGHT_LEGS.map((points) => (
            <Polyline key={`l${points}`} points={mirror(points)} />
          ))}
        </G>
        <Ellipse cx={50} cy={39} rx={9} ry={12} fill={colors.surface} stroke={colors.dim} strokeWidth={0.8} />
        <Ellipse cx={50} cy={56} rx={7} ry={7.5} fill={colors.surface} stroke={colors.dim} strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spider: { position: 'absolute', pointerEvents: 'none' },
  svg: { overflow: 'visible' },
});
