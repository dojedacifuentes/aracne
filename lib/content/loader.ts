import categories from "../../content/categories.json";
import figures from "../../content/figures.json";
import { RAW_ENTRIES } from "../../content/index.generated";
import rooms from "../../content/rooms.json";
import { legStates, parseCorpus, type Corpus, type LegState } from "./corpus";

export interface Archive {
  corpus: Corpus;
  /** Las patas en orden de anillo, con su estado calculado. */
  legs: LegState[];
}

let cached: Archive | null = null;

/**
 * El archivo, cargado una vez. `npm run validate` corre antes de cada build,
 * así que aquí no debería llegar nada inválido; si llegara, se descarta lo que
 * no pasa el esquema en lugar de romper la aplicación.
 */
export function loadArchive(): Archive {
  if (cached) return cached;
  const { corpus } = parseCorpus({ entries: RAW_ENTRIES, categories, figures, rooms });
  cached = { corpus, legs: legStates(corpus.entries, corpus.categories) };
  return cached;
}
