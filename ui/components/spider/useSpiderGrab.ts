import type { GrabVoice } from '../../audio/audioConfig';
import type { SpiderGrab, SpiderHandleRef } from './spiderConfig';

/**
 * En iOS y Android no hay escena 3D que manipular ni eventos de puntero que
 * medir: la araña es la silueta vectorial y pulsarla sigue siendo cosa del
 * botón. Metro resuelve `useSpiderGrab.web.ts` en web y este archivo en
 * nativo, igual que hace con `SpiderScene`.
 */
const STILL: SpiderGrab = { wasDrag: () => false };

export function useSpiderGrab(_handle: SpiderHandleRef, _enabled: boolean, _voice?: GrabVoice): SpiderGrab {
  return STILL;
}
