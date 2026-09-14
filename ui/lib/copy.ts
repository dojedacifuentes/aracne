import type { Link } from '../../lib/drift/graph';
import { TYPE_LABEL } from '../../lib/labels';
import type { Invocation, Shape } from '../../lib/oracle/invoke';
import type { EntryType } from '../../lib/schema';

/** Textos del resultado. Solo leen metadatos reales: nunca afirman nada nuevo. */

type CategoryName = (id: string) => string | undefined;

export const SHAPE_LABEL: Record<Shape, string> = {
  entrada: 'entrada',
  arista: 'arista',
  constelacion: 'constelación',
  deriva: 'deriva',
};

const TYPE_IDS = Object.keys(TYPE_LABEL) as EntryType[];

/** `invoke()` compone algunas frases con los ids ingleses de los tipos; aquí se leen en español. */
export function spanishTypes(text: string): string {
  return TYPE_IDS.reduce((out, id) => out.replace(new RegExp(`\\b${id}\\b`, 'g'), TYPE_LABEL[id]), text);
}

/** Límites de palabra que entienden acentos, sin depender de `\p{L}`. */
const WORD = 'A-Za-zÀ-ÖØ-öø-ÿ0-9-';

/**
 * `invoke()` inserta en el dictamen la etiqueta del puente tal cual: a veces un
 * id de categoría o de tipo («psicopolitica», «work»). Aquí se lee como nombre.
 * Los tags se quedan como están: son su propio nombre.
 */
export function dictumText(invocation: Invocation, categoryName: CategoryName): string {
  const { kind, label } = invocation.bridge;
  if (!label) return invocation.dictum;
  const readable = categoryName(label) ?? (kind === 'tipo' ? TYPE_LABEL[label as EntryType] : undefined);
  if (!readable || readable === label) return invocation.dictum;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return invocation.dictum.replace(new RegExp(`(^|[^${WORD}])${escaped}(?=$|[^${WORD}])`, 'g'), `$1${readable}`);
}

export function bridgeText(invocation: Invocation, categoryName: CategoryName): string {
  const count = invocation.entries.length;
  if (count < 2) return 'una sola entrada: no hay nada que unir.';
  const who = count === 2 ? 'las dos' : 'las dos primeras';
  const { kind, label } = invocation.bridge;
  switch (kind) {
    case 'tag':
      return `${who} llevan el tag ${label}.`;
    case 'categoria':
      return `${who} están en ${categoryName(label) ?? label}.`;
    case 'autor':
      return `${who} citan a ${label}.`;
    case 'tipo':
      return `${who} son del mismo tipo: ${TYPE_LABEL[label as EntryType] ?? label}.`;
    case 'explicita':
      return label === 'un vínculo anotado a mano'
        ? 'un vínculo anotado a mano.'
        : `un vínculo anotado a mano; además comparten ${categoryName(label) ?? label}.`;
    default:
      return 'nada que el archivo sepa.';
  }
}

export function faultText(invocation: Invocation): string {
  if (invocation.entries.length < 2) return 'una sola entrada: no hay nada que separar.';
  return invocation.fault ? `${spanishTypes(invocation.fault)}.` : 'nada visible en sus metadatos.';
}

/** La razón de un paso de la deriva, para leerse detrás de «por». */
export function linkText(link: Link, categoryName: CategoryName): string {
  switch (link.reason) {
    case 'explicit':
      return 'un vínculo anotado a mano';
    case 'tag':
      return `el tag ${link.label}`;
    case 'category':
      return categoryName(link.label) ?? link.label;
    case 'author':
      return link.label;
    case 'type':
      return `ser ${TYPE_LABEL[link.label as EntryType] ?? link.label}`;
  }
}

/**
 * Lo que dice una pata cuando se la mira sin verla: el mismo texto en el
 * anillo de la portada y en la lista de móvil. Un vínculo no puede llamarse de
 * dos maneras según dónde se lea, y una pata tampoco.
 */
export function legHint(count: number, lit: boolean, missing: number, selected: boolean): string {
  if (!lit) return `retraída: faltan ${missing} ${missing === 1 ? 'entrada' : 'entradas'}`;
  return `${count} ${count === 1 ? 'entrada' : 'entradas'}. ${selected ? 'apoyada' : 'en reposo'}`;
}

/**
 * Las primeras palabras de una descripción, para el anillo: ahí no cabe la
 * frase entera y cortarla por palabras es menos violento que por caracteres.
 */
export function firstWords(text: string, words: number): string {
  const all = text.trim().split(/\s+/);
  if (all.length <= words) return text.trim();
  return `${all.slice(0, words).join(' ').replace(/[,.;:]$/, '')}…`;
}
