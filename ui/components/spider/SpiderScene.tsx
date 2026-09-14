import type { SpiderSceneProps } from './spiderConfig';

/**
 * En iOS y Android no hay escena 3D: three necesitaría expo-gl y otro cargador
 * de modelos. Metro resuelve `SpiderScene.web.tsx` en web y este archivo en
 * nativo, donde se dibuja la araña vectorial.
 */
export const SPIDER_3D_AVAILABLE = false;

export function SpiderScene(_props: SpiderSceneProps) {
  return null;
}
