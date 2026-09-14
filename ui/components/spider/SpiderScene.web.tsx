import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { MOTION, SCENE, type SpiderSceneProps } from './spiderConfig';
import { acquireSpider, releaseSpider } from './spiderModel';
import { SpiderRig } from './SpiderRig';

export const SPIDER_3D_AVAILABLE = true;

/** Distancia a la que la altura visible en z = 0 mide exactamente 2. */
const CAMERA_DISTANCE = 1 / Math.tan((SCENE.fov * Math.PI) / 360);

type Controls = {
  options: () => void;
  legs: () => void;
  hover: () => void;
  press: () => void;
  request: () => void;
};

const clamp = (value: number) => Math.min(1, Math.max(-1, value));

/**
 * La escena de la araña. Un solo WebGLRenderer y un solo bucle, que se
 * detiene cuando la escena no se ve, cuando la pestaña está oculta y, con
 * reducción de movimiento, en cuanto no queda nada que animar.
 *
 * El lienzo no recibe eventos (`pointer-events: none`): pulsar es cosa del
 * botón que monta `Spider`. Aquí solo se escucha el cursor, sin capturarlo,
 * para el paralaje.
 */
export function SpiderScene({
  options,
  legs,
  ringSize,
  reduceMotion,
  pressToken,
  hover,
  onFailure,
}: SpiderSceneProps) {
  const hostRef = useRef<View | null>(null);
  const controls = useRef<Controls | null>(null);
  const live = useRef({ options, legs, ringSize, reduceMotion, hover, onFailure });

  useEffect(() => {
    live.current.options = options;
    controls.current?.options();
  }, [options]);

  useEffect(() => {
    live.current.legs = legs;
    live.current.ringSize = ringSize;
    controls.current?.legs();
  }, [legs, ringSize]);

  useEffect(() => {
    live.current.reduceMotion = reduceMotion;
    controls.current?.request();
  }, [reduceMotion]);

  useEffect(() => {
    live.current.hover = hover;
    controls.current?.hover();
  }, [hover]);

  useEffect(() => {
    live.current.onFailure = onFailure;
  }, [onFailure]);

  useEffect(() => {
    if (pressToken > 0) controls.current?.press();
  }, [pressToken]);

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host || typeof window === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
    });
    host.appendChild(canvas);

    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? SCENE.maxDprCoarse : SCENE.maxDprFine);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: dpr < 2, powerPreference: 'low-power' });
    } catch {
      canvas.remove();
      live.current.onFailure();
      return;
    }
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;

    const scene = new Scene();
    const camera = new PerspectiveCamera(SCENE.fov, 1, 0.1, 50);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    // Negro cálido: una luz principal baja y cálida, relleno mínimo y un contorno
    // que separa la silueta del fondo. Nada de bloom ni de niebla.
    const fill = new HemisphereLight(0xedeae3, 0x0e0d0c, SCENE.light.fill);
    const key = new DirectionalLight(0xfff0dc, SCENE.light.key);
    key.position.set(-1.8, 2.4, 2.6);
    const rim = new DirectionalLight(0xedeae3, SCENE.light.rim);
    rim.position.set(1.6, 2.2, -2.8);
    scene.add(fill, key, rim);

    const stage = { width: 2, height: 2 };
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let rig: SpiderRig | null = null;
    let disposed = false;
    let frame = 0;
    let last = performance.now();
    let onScreen = true;
    let pageVisible = document.visibilityState !== 'hidden';

    const request = () => {
      if (frame === 0 && !disposed && onScreen && pageVisible) frame = requestAnimationFrame(draw);
    };

    function draw(now: number) {
      frame = 0;
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const quiet = live.current.reduceMotion;

      if (quiet) {
        pointer.x = 0;
        pointer.y = 0;
      } else {
        const follow = Math.min(1, dt * 2.5);
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;
      }
      camera.position.x = pointer.x * MOTION.parallax * stage.height;
      camera.position.y = pointer.y * MOTION.parallax * stage.height;
      camera.lookAt(0, 0, 0);

      let busy = false;
      if (rig) {
        busy = rig.update(now / 1000, dt, quiet);
        key.intensity = SCENE.light.key * (1 - 0.45 * rig.dim);
        rim.intensity = SCENE.light.rim * (1 - 0.3 * rig.dim);
      }
      renderer.render(scene, camera);

      const drifting =
        !quiet && (Math.abs(pointer.targetX - pointer.x) > 1e-3 || Math.abs(pointer.targetY - pointer.y) > 1e-3);
      if (busy || drifting) request();
    }

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      stage.width = 2 * camera.aspect;
      stage.height = 2;
      rig?.setStage(stage);
      request();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const intersection = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
      last = performance.now();
      request();
    });
    intersection.observe(host);

    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      last = performance.now();
      request();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Paralaje solo con ratón: en táctil no hay cursor que seguir.
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.targetX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1);
      pointer.targetY = clamp(1 - ((event.clientY - rect.top) / rect.height) * 2);
      request();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      if (!disposed) live.current.onFailure();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    controls.current = {
      options: () => {
        rig?.setOptions(live.current.options);
        request();
      },
      legs: () => {
        rig?.setLegs(live.current.legs, live.current.ringSize, live.current.reduceMotion, performance.now() / 1000);
        request();
      },
      hover: () => {
        rig?.setNear(live.current.hover && !live.current.reduceMotion);
        request();
      },
      press: () => {
        rig?.press(performance.now());
        request();
      },
      request,
    };

    // Solo en desarrollo: avanzar la escena a mano cuando requestAnimationFrame
    // no corre (un panel o una pestaña ocultos), para poder revisarla.
    const debug = window as unknown as { __aracneSpider?: { step: (frames?: number, frameMs?: number) => void } };
    if (__DEV__) {
      debug.__aracneSpider = {
        step: (frames = 1, frameMs = 1000 / 60) => {
          for (let i = 0; i < frames; i += 1) draw(last + frameMs);
        },
      };
    }

    // El modelo se pide cuando la escena ya existe, nunca antes.
    acquireSpider()
      .then((model) => {
        if (disposed) return;
        rig = new SpiderRig(model, live.current.options);
        rig.setStage(stage);
        rig.setLegs(live.current.legs, live.current.ringSize, true, performance.now() / 1000);
        scene.add(rig.object);
        last = performance.now();
        request();
      })
      .catch(() => {
        if (!disposed) live.current.onFailure();
      });

    return () => {
      disposed = true;
      controls.current = null;
      if (__DEV__) delete debug.__aracneSpider;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (rig) {
        scene.remove(rig.object);
        rig.dispose();
      }
      releaseSpider();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <View ref={hostRef} style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
});
