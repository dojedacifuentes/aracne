import type { AracneSpiderEffectProps } from './spiderEffectConfig';

/**
 * En nativo no hay cursor que seguir, así que la entidad no existe. La versión
 * de verdad está en `AracneSpiderEffect.web.tsx`, que Metro elige en web.
 */
export function AracneSpiderEffect(props: AracneSpiderEffectProps): null {
  void props;
  return null;
}
