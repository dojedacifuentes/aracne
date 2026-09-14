import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

import { NATIVE_DRIVER } from '../theme';

/** docs/DESIGN.md: el único momento de movimiento de la interfaz. */
const APPEAR_MS = 320;
const STAGGER_MS = 40;
const RISE_PX = 8;
const REDUCED_MS = 120;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

type Props = {
  /** Posición en el escalonado: identificador, título, cuerpo, pregunta… */
  index?: number;
  reduceMotion: boolean;
  children: ReactNode;
};

/**
 * La entrada aparece: opacidad y ocho píxeles, 320 ms, 40 ms entre piezas.
 * Con reducción de movimiento, un fundido de 120 ms sin desplazamiento.
 * Mecanismo heredado de las escenas del tarot, con los tiempos de este archivo.
 */
export function Reveal({ index = 0, reduceMotion, children }: Props) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? REDUCED_MS : APPEAR_MS,
      delay: reduceMotion ? 0 : index * STAGGER_MS,
      easing: reduceMotion ? Easing.linear : EASE,
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, index, reduceMotion]);

  const translateY = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [RISE_PX, 0] });

  return <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>{children}</Animated.View>;
}
