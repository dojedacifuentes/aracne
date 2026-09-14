import type { EpistemicStatus } from '../../lib/schema';

export type Rule = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

export interface StatusBorder {
  rule: Rule;
  /** Grosor total del borde izquierdo, en píxeles. */
  width: number;
  /** El borde usa el texto o el dim: nunca un color que codifique el estado. */
  tone: 'text' | 'dim';
  /** Solo `unverified`: sin borde y con la etiqueta en el acento. */
  accentLabel: boolean;
}

/**
 * docs/DESIGN.md: el estado epistémico se codifica en el borde izquierdo del
 * bloque de contenido, nunca con color, para que funcione en monocromo y no
 * monte un semáforo.
 */
export const STATUS_BORDER: Record<EpistemicStatus, StatusBorder> = {
  fact: { rule: 'solid', width: 1, tone: 'text', accentLabel: false },
  hypothesis: { rule: 'dashed', width: 1, tone: 'text', accentLabel: false },
  speculation: { rule: 'dashed', width: 1, tone: 'text', accentLabel: false },
  interpretation: { rule: 'solid', width: 1, tone: 'dim', accentLabel: false },
  fiction: { rule: 'double', width: 3, tone: 'text', accentLabel: false },
  controversial: { rule: 'dotted', width: 1, tone: 'text', accentLabel: false },
  unverified: { rule: 'none', width: 0, tone: 'text', accentLabel: true },
};
