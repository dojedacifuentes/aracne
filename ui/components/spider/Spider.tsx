import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useFocusRing } from '../../hooks/useFocusRing';
import { colors } from '../../theme';
import { SCENE, SPIDER_DEFAULTS, type SpiderHandle, type SpiderOptions } from './spiderConfig';
import { SpiderBoundary } from './SpiderBoundary';
import { SpiderFallback } from './SpiderFallback';
import { SPIDER_3D_AVAILABLE, SpiderScene } from './SpiderScene';
import { useSpiderGrab } from './useSpiderGrab';

export type SpiderProps = Partial<SpiderOptions> & {
  /** Patas apoyadas, por su posición en el anillo. */
  legs?: readonly number[];
  /** Número de patas del anillo: sale del contenido. */
  ringSize: number;
  onPress?: () => void;
  /** Nombre del gesto para lectores de pantalla. */
  label?: string;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
};

const NO_LEGS: readonly number[] = [];

/**
 * La araña del oráculo. Por dentro elige: escena 3D en web con WebGL y, si no,
 * la silueta vectorial. Por fuera es siempre lo mismo: un escenario que no
 * captura eventos y, sobre la araña, un botón real que se pulsa y se enfoca
 * con teclado.
 *
 *   <Spider ringSize={11} legs={[0, 4]} position={[0.5, 0.55]} scale={1} silk onPress={invocar} />
 */
export function Spider({
  position = SPIDER_DEFAULTS.position,
  scale = SPIDER_DEFAULTS.scale,
  rotation = SPIDER_DEFAULTS.rotation,
  visible = SPIDER_DEFAULTS.visible,
  motionIntensity = SPIDER_DEFAULTS.motionIntensity,
  speed = SPIDER_DEFAULTS.speed,
  silk = SPIDER_DEFAULTS.silk,
  silkLength = SPIDER_DEFAULTS.silkLength,
  silkOpacity = SPIDER_DEFAULTS.silkOpacity,
  silkSlack = SPIDER_DEFAULTS.silkSlack,
  entrance = SPIDER_DEFAULTS.entrance,
  entranceDuration = SPIDER_DEFAULTS.entranceDuration,
  legs = NO_LEGS,
  ringSize,
  onPress,
  label = 'invocar',
  reduceMotion = false,
  style,
}: SpiderProps) {
  const [px, py] = position;
  const [rx, ry, rz] = rotation;
  const options = useMemo<SpiderOptions>(
    () => ({
      position: [px, py],
      scale,
      rotation: [rx, ry, rz],
      visible,
      motionIntensity,
      speed,
      silk,
      silkLength,
      silkOpacity,
      silkSlack,
      entrance,
      entranceDuration,
    }),
    [px, py, scale, rx, ry, rz, visible, motionIntensity, speed, silk, silkLength, silkOpacity, silkSlack, entrance, entranceDuration],
  );

  const [box, setBox] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const [pressToken, setPressToken] = useState(0);
  const [hover, setHover] = useState(false);
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  // El canal con la escena: por aquí entra la mano y no vuelve a renderizar nada.
  const handle = useRef<SpiderHandle | null>(null);
  const { attach, wasDrag } = useSpiderGrab(handle, SPIDER_3D_AVAILABLE && !failed && visible);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);
  const handleFailure = useCallback(() => setFailed(true), []);
  const press = useCallback(() => {
    // Tirar del animal y soltarlo no es pulsarlo: el clic que llega detrás se descarta.
    if (wasDrag()) return;
    setPressToken((count) => count + 1);
    onPress?.();
  }, [wasDrag, onPress]);

  // El área pulsable cubre la araña y su recorrido cuando las patas tiran de ella.
  const span = Math.min(box.width, box.height) * SCENE.span * scale;
  const hit = Math.max(88, span * 1.3);

  const fallback =
    box.width > 0 ? (
      <SpiderFallback
        width={box.width}
        height={box.height}
        options={options}
        legs={legs}
        ringSize={ringSize}
        reduceMotion={reduceMotion}
        pressToken={pressToken}
      />
    ) : null;

  return (
    <View style={[styles.stage, style]} onLayout={onLayout}>
      {SPIDER_3D_AVAILABLE && !failed ? (
        <SpiderBoundary fallback={fallback} onError={handleFailure}>
          <SpiderScene
            options={options}
            legs={legs}
            ringSize={ringSize}
            reduceMotion={reduceMotion}
            pressToken={pressToken}
            hover={hover}
            handle={handle}
            onFailure={handleFailure}
          />
        </SpiderBoundary>
      ) : (
        fallback
      )}
      {visible && box.width > 0 ? (
        <Pressable
          ref={attach}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={press}
          onHoverIn={() => setHover(true)}
          onHoverOut={() => setHover(false)}
          onFocus={onFocus}
          onBlur={onBlur}
          style={[
            styles.target,
            {
              left: px * box.width - hit / 2,
              top: py * box.height - hit / 2,
              width: hit,
              height: hit,
              borderRadius: hit / 2,
            },
            focusVisible && styles.focused,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'hidden' },
  target: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'transparent',
    outlineWidth: 0,
  },
  // El foco es uno de los dos únicos usos del acento.
  focused: { borderColor: colors.accent },
});
