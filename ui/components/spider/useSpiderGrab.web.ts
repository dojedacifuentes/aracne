import { useEffect, useMemo, useRef } from 'react';

import type { Vec2 } from '../../../lib/aleph/tension';
import type { GrabVoice } from '../../audio/audioConfig';
import { GRIP, type SpiderGrab, type SpiderHandleRef } from './spiderConfig';
import { trackMove, trackSpeed, trackStart, type PointerTrack } from './spiderMotion';

/**
 * La mano sobre la araña. Se engancha al mismo elemento que ya se pulsa —el
 * botón que monta `Spider`—, así que no hay un segundo objetivo invisible ni
 * se toca el lienzo, que sigue sin recibir eventos.
 *
 * Aquí no hay física: solo se mide dónde está el dedo y a qué velocidad va, y
 * se le cuenta a la escena en píxeles de cliente. Quien traduce a mundo es
 * `SpiderScene.web.tsx` y quien decide qué hacer con ello es `SpiderRig`.
 *
 * Nada de esto pasa por el estado de React: arrastrar no vuelve a renderizar.
 *
 * `touch-action: pan-y` reparte el gesto táctil: un recorrido vertical sigue
 * siendo de la página —la araña vive dentro de una columna que se recorre— y
 * uno lateral es del animal. Capturado el puntero, lo que queda del gesto es
 * suyo en cualquier dirección.
 */
export function useSpiderGrab(handle: SpiderHandleRef, enabled: boolean, voice?: GrabVoice): SpiderGrab {
  // La voz cambia de identidad en cada render: se lee por referencia, como el canal.
  const live = useRef<{ handle: SpiderHandleRef; enabled: boolean; voice?: GrabVoice }>({ handle, enabled, voice });
  useEffect(() => {
    live.current.handle = handle;
    live.current.enabled = enabled;
    live.current.voice = voice;
  }, [handle, enabled, voice]);

  const gesture = useRef({
    node: null as HTMLElement | null,
    /** Puntero activo, o −1. Solo hay uno cada vez. */
    id: -1,
    /** Dónde tocó. El umbral se mide desde aquí y no desde la muestra anterior. */
    downX: 0,
    downY: 0,
    moved: false,
    endedAt: -Infinity,
  });
  const track = useRef<PointerTrack>({ x: 0, y: 0, t: 0, vx: 0, vy: 0 });
  const speed = useRef<Vec2>({ x: 0, y: 0 });

  return useMemo<SpiderGrab>(() => {
    const down = (event: PointerEvent) => {
      const state = gesture.current;
      // Un segundo dedo se ignora. El sitio donde entraría el pellizco es este.
      if (!live.current.enabled || state.id !== -1 || event.button > 0) return;
      const target = live.current.handle.current;
      if (!target) return;
      state.id = event.pointerId;
      state.downX = event.clientX;
      state.downY = event.clientY;
      state.moved = false;
      trackStart(track.current, event.clientX, event.clientY, event.timeStamp);
      // El puntero puede haberse levantado antes de que llegue esto: capturarlo tira.
      try {
        state.node?.setPointerCapture?.(event.pointerId);
      } catch {
        // Sin captura el gesto sigue funcionando mientras no salga del botón.
      }
      target.beginGrab(event.clientX, event.clientY);
      live.current.voice?.touch();
    };

    /**
     * Cuánto se ha llevado la mano el cuerpo, de 0 a 1. Se mide en anchuras
     * del propio objetivo, que es proporcional a la envergadura del animal:
     * así el oído concuerda con lo que se ve sin que el gesto tenga que
     * saber nada del mundo 3D. La curva de resistencia del rig es monótona,
     * de modo que más gesto es siempre más tensión, aquí y allí.
     */
    const reach = () => Math.max(1, (gesture.current.node?.clientWidth ?? 0) * 0.8);

    const move = (event: PointerEvent) => {
      const state = gesture.current;
      if (state.id !== event.pointerId) return;
      trackMove(track.current, event.clientX, event.clientY, event.timeStamp);
      if (!state.moved) {
        if (Math.hypot(event.clientX - state.downX, event.clientY - state.downY) < GRIP.dragThreshold) return;
        state.moved = true;
      }
      live.current.handle.current?.dragTo(event.clientX, event.clientY);
      const far = Math.hypot(event.clientX - state.downX, event.clientY - state.downY);
      live.current.voice?.pull(Math.min(1, far / reach()));
    };

    const end = (event: PointerEvent, lifted: boolean) => {
      const state = gesture.current;
      if (state.id !== event.pointerId) return;
      state.id = -1;
      // Tirar no es pulsar: si hubo recorrido, la invocación que viene detrás se descarta.
      if (state.moved) state.endedAt = event.timeStamp;
      const target = live.current.handle.current;
      if (!target) return;
      if (!lifted || !state.moved) {
        target.cancel();
        live.current.voice?.drop(0);
        return;
      }
      trackSpeed(speed.current, track.current, event.timeStamp);
      target.release(speed.current.x, speed.current.y);
      live.current.voice?.drop(Math.min(1, Math.hypot(speed.current.x, speed.current.y) / (reach() * 5)));
    };

    const up = (event: PointerEvent) => end(event, true);
    const cancel = (event: PointerEvent) => end(event, false);

    const attach = (node: unknown) => {
      const previous = gesture.current.node;
      if (previous) {
        previous.removeEventListener('pointerdown', down);
        previous.removeEventListener('pointermove', move);
        previous.removeEventListener('pointerup', up);
        previous.removeEventListener('pointercancel', cancel);
        previous.removeEventListener('lostpointercapture', cancel);
      }
      const element = node as HTMLElement | null;
      gesture.current.node = element;
      if (!element || typeof element.addEventListener !== 'function') return;
      element.style.touchAction = GRIP.touchAction;
      element.style.userSelect = 'none';
      element.addEventListener('pointerdown', down);
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', up);
      element.addEventListener('pointercancel', cancel);
      element.addEventListener('lostpointercapture', cancel);
    };

    return {
      attach,
      wasDrag: () => performance.now() - gesture.current.endedAt < GRIP.clickGraceMs,
    };
  }, []);
}
