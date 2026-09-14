import { z } from "zod";

import {
  CATEGORY_VISIBILITY_THRESHOLD,
  CategorySchema,
  EntrySchema,
  validateCorpus,
  type Entry,
  type ValidationIssue,
} from "../schema";

/**
 * `CategorySchema` no declara `leg` ni `glyph`, y zod descarta lo que no está
 * declarado: sin esta ampliación el anillo perdería su orden al parsear.
 */
export const RingCategorySchema = CategorySchema.extend({
  leg: z.number().int().min(0),
  glyph: z.string().min(1),
});

/**
 * Una obra que se puede abrir. La URL no se inventa nunca: entra solo si
 * alguien la ha pedido y ha contestado (CLAUDE.md, regla 4). Cuando no hay
 * nada verificado, la lista se queda vacía y la ficha lo dice.
 */
export const WorkSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  /** Quién la sirve: Project Gutenberg, Internet Archive, un museo… */
  where: z.string().min(1),
  /** Qué hay al otro lado. */
  kind: z.enum(["texto", "facsimil", "archivo", "ficha"]),
});

export const FigureSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  years: z.string().min(1),
  emblem: z.string().min(1),
  /** Un solo tema: las biografías se leen en orden, no en rejilla. */
  theme: z.string().min(1),
  /** Una idea suya poco citada. No una valoración de su obra. */
  idea: z.string().min(1),
  /** Un hecho verificable y poco citado: la anécdota. */
  note: z.string().min(1),
  works: z.array(WorkSchema).default([]),
  entries: z.array(z.string()).default([]),
});

export const ThemeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  criterion: z.string().min(1),
});

export type RingCategory = z.infer<typeof RingCategorySchema>;
export type Figure = z.infer<typeof FigureSchema>;
export type Work = z.infer<typeof WorkSchema>;
export type Theme = z.infer<typeof ThemeSchema>;

export interface Corpus {
  entries: Entry[];
  /** Ordenadas por su posición en el anillo. */
  categories: RingCategory[];
  figures: Figure[];
  /** En el orden en que se leen. */
  themes: Theme[];
}

export interface RawCorpus {
  entries: unknown[];
  categories: unknown;
  figures: unknown;
  themes: unknown;
}

function parseList<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
  label: string,
  issues: ValidationIssue[],
): z.output<S>[] {
  if (!Array.isArray(raw)) {
    issues.push({ id: label, message: "no es una lista" });
    return [];
  }
  const parsed: z.output<S>[] = [];
  raw.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      parsed.push(result.data);
      return;
    }
    const id = (item as { id?: string })?.id ?? `${label}[${index}]`;
    for (const e of result.error.issues) {
      issues.push({ id, message: `${label}: ${e.path.join(".")}: ${e.message}` });
    }
  });
  return parsed;
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/**
 * Parsea y cruza todo el contenido. Devuelve lo que es válido y la lista de
 * problemas; decidir si un problema detiene algo es cosa de quien llama.
 */
export function parseCorpus(raw: RawCorpus): { corpus: Corpus; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  const categories = parseList(RingCategorySchema, raw.categories, "categorías", issues).sort(
    (a, b) => a.leg - b.leg,
  );
  const figures = parseList(FigureSchema, raw.figures, "figuras", issues);
  const themes = parseList(ThemeSchema, raw.themes, "temas", issues);

  // El anillo: posiciones 0..n-1, sin huecos ni repeticiones.
  categories.forEach((category, index) => {
    if (category.leg !== index) {
      issues.push({ id: category.id, message: `el anillo tiene un hueco o una repetición en la posición ${index}` });
    }
  });
  for (const id of duplicates(categories.map((c) => c.id))) issues.push({ id, message: "categoría duplicada" });
  for (const glyph of duplicates(categories.map((c) => c.glyph))) issues.push({ id: glyph, message: "glifo repetido" });
  for (const id of duplicates(figures.map((f) => f.id))) issues.push({ id, message: "figura duplicada" });
  for (const id of duplicates(themes.map((t) => t.id))) issues.push({ id, message: "tema duplicado" });

  issues.push(...validateCorpus(raw.entries, categories.map((c) => c.id)));

  const entries: Entry[] = [];
  const seen = new Set<string>();
  for (const item of raw.entries) {
    const result = EntrySchema.safeParse(item);
    if (result.success && !seen.has(result.data.id)) {
      entries.push(result.data);
      seen.add(result.data.id);
    }
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(entries.map((e) => [e.id, e]));

  // CLAUDE.md: la relación explícita es bidireccional.
  for (const entry of entries) {
    for (const id of entry.related) {
      const other = byId.get(id);
      if (other && !other.related.includes(entry.id)) {
        issues.push({ id: entry.id, message: `related no es bidireccional: ${id} no apunta de vuelta` });
      }
    }
  }

  const themeIds = new Set(themes.map((t) => t.id));
  for (const figure of figures) {
    if (!themeIds.has(figure.theme)) {
      issues.push({ id: figure.id, message: `tema inexistente: ${figure.theme}` });
    }
    for (const id of figure.entries) {
      if (!byId.has(id)) issues.push({ id: figure.id, message: `entrada inexistente: ${id}` });
    }
    for (const work of figure.works) {
      // Una obra sin enlace no es una obra: es una cita de memoria.
      if (!work.url.startsWith("http://") && !work.url.startsWith("https://")) {
        issues.push({ id: figure.id, message: `obra sin URL utilizable: ${work.title}` });
      }
    }
  }

  return { corpus: { entries, categories, figures, themes }, issues };
}

export interface LegState {
  category: RingCategory;
  count: number;
  /** Encendida: se muestra y se puede apoyar. */
  visible: boolean;
  /** Entradas que le faltan para encenderse. */
  missing: number;
}

/** Una categoría se enciende sola al llegar al umbral. Nunca se marca a mano. */
export function legStates(entries: readonly Entry[], categories: readonly RingCategory[]): LegState[] {
  return categories.map((category) => {
    const count = entries.filter((e) => e.categories.includes(category.id)).length;
    return {
      category,
      count,
      visible: count >= CATEGORY_VISIBILITY_THRESHOLD,
      missing: Math.max(0, CATEGORY_VISIBILITY_THRESHOLD - count),
    };
  });
}

/** Solo las patas encendidas llegan al motor; lo demás se descarta. */
export function usableLegs(requested: readonly string[], states: readonly LegState[]): string[] {
  const lit = new Set(states.filter((s) => s.visible).map((s) => s.category.id));
  return [...new Set(requested)].filter((id) => lit.has(id));
}
