import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

import { NATIVE_DRIVER } from '../theme';

/** docs/DESIGN.md: el único momento de movimiento de la interfaz. */
const APPEAR_MS = 320;
const STAGGER_MS = 40;
const RISE_PX = 8;
const REDUCED_MS = 120;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** Lo que se espera tras el final previsto antes de dar la animación por perdida. */
const SETTLE_MARGIN_MS = 80;

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
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    progress.setValue(0);
    const duration = reduceMotion ? REDUCED_MS : APPEAR_MS;
    const delay = reduceMotion ? 0 : index * STAGGER_MS;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: reduceMotion ? Easing.linear : EASE,
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start(({ finished }) => {
      if (finished) setSettled(true);
    });
    // El contenido no puede depender de que el navegador anime. Donde
    // `requestAnimationFrame` no dispara —una pestaña de fondo, el ahorro de
    // energía, una captura— la animación no arranca y esto se quedaría a
    // opacidad 0, es decir invisible. Este plazo lo deja visto de todas formas.
    const settle = setTimeout(() => setSettled(true), delay + duration + SETTLE_MARGIN_MS);
    return () => {
      animation.stop();
      clearTimeout(settle);
    };
  }, [progress, index, reduceMotion]);

  const translateY = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [RISE_PX, 0] });

  // Ya visto: opacidad fija, sin transformación. No se cambia de componente,
  // para no desmontar lo que hay dentro.
  const style = settled
    ? { opacity: 1 }
    : { opacity: progress, transform: [{ translateY }] };

  return <Animated.View style={style}>{children}</Animated.View>;
}
