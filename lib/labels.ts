import type { Entry, EntryType, EpistemicStatus } from './schema';

/** Los ids del esquema están en inglés; la interfaz habla en español. */
export const TYPE_LABEL: Record<EntryType, string> = {
  concept: 'concepto',
  work: 'obra',
  case: 'caso',
  phenomenon: 'fenómeno',
  experiment: 'experimento',
  paradox: 'paradoja',
  question: 'pregunta',
  place: 'lugar',
  event: 'acontecimiento',
  object: 'objeto',
  character: 'personaje',
  portal: 'portal',
  technology: 'tecnología',
  theory: 'teoría',
  anomaly: 'anomalía',
};

export const STATUS_LABEL: Record<EpistemicStatus, string> = {
  fact: 'hecho',
  hypothesis: 'hipótesis',
  fiction: 'ficción',
  speculation: 'especulación',
  interpretation: 'interpretación',
  controversial: 'disputado',
  unverified: 'pendiente de verificar',
};

/** De qué clase es una fuente. Se lee en el expediente, bajo su nombre. */
export const SOURCE_KIND_LABEL: Record<Entry['sources'][number]['kind'], string> = {
  primary: 'fuente primaria',
  secondary: 'fuente secundaria',
  reference: 'referencia',
  portal: 'portal',
};

/** `delyra-0047` → `DELYRA 0047`: un número de catálogo, el único texto en mayúsculas. */
export function catalogId(id: string): string {
  return id.replace('-', ' ').toUpperCase();
}
