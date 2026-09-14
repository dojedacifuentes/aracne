import type { LinkReason } from '../../lib/drift/graph';
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

export interface ThreadStyle {
  /** Patrón del trazo, o null para continuo. */
  dash: number[] | null;
  /** Multiplica el grosor que ya da el peso del vínculo. */
  weight: number;
  /** Cómo se lee la razón en la leyenda. */
  label: string;
}

/**
 * Cómo se dibuja un hilo según por qué existe.
 *
 * Es la misma gramática que `STATUS_BORDER`: **el trazo codifica la certeza,
 * nunca el color**. Un grafo que dibuja todas sus uniones igual afirma que
 * todas dicen lo mismo, y no es verdad: que alguien anotara un vínculo a mano
 * y que dos entradas sean del mismo tipo son dos cosas muy distintas.
 *
 * Continuo, lo que el archivo declara. Discontinuo, lo que solo comparten.
 * Punteado, la coincidencia más débil que el grafo sabe ver.
 */
export const THREAD_STYLE: Record<LinkReason, ThreadStyle> = {
  explicit: { dash: null, weight: 1.6, label: 'anotado a mano' },
  tag: { dash: null, weight: 1, label: 'un tag compartido' },
  author: { dash: null, weight: 0.8, label: 'una fuente compartida' },
  category: { dash: [4, 3], weight: 0.8, label: 'la misma pata' },
  type: { dash: [1, 3], weight: 0.7, label: 'el mismo tipo' },
};
