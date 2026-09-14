import { z } from "zod";

export const ENTRY_TYPES = [
  "concept", "work", "case", "phenomenon", "experiment", "paradox",
  "question", "place", "event", "object", "character", "portal",
  "technology", "theory", "anomaly",
] as const;

export const EPISTEMIC_STATUS = [
  "fact", "hypothesis", "fiction", "speculation",
  "interpretation", "controversial", "unverified",
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type EpistemicStatus = (typeof EPISTEMIC_STATUS)[number];

const score = z.number().int().min(1).max(5);

export const SourceSchema = z.object({
  label: z.string().min(1),
  author: z.string().optional(),
  work: z.string().optional(),
  year: z.number().int().optional(),
  url: z.string().url().optional(),
  kind: z.enum(["primary", "secondary", "reference", "portal"]),
});

export const EntrySchema = z.object({
  id: z.string().regex(/^delyra-\d{4}$/),
  title: z.string().min(1),
  type: z.enum(ENTRY_TYPES),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  content: z.string().min(1),
  question: z.string().min(1),
  sources: z.array(SourceSchema).default([]),
  contributors: z.array(z.string()).min(1),
  epistemicStatus: z.enum(EPISTEMIC_STATUS),
  scores: z.object({
    strangeness: score,
    darkness: score,
    fictionality: score,
  }),
  sensitive: z.boolean().default(false),
  related: z.array(z.string()).default([]),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Rastro crudo de la captura: link, nombre, lo que se recordaba. */
  captureNote: z.string().optional(),
});

export const CategorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export const ContributorSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().default(""),
});

export type Entry = z.infer<typeof EntrySchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Contributor = z.infer<typeof ContributorSchema>;

/** Umbral a partir del cual una categoría se muestra en la interfaz. */
export const CATEGORY_VISIBILITY_THRESHOLD = 3;

export interface ValidationIssue {
  id: string;
  message: string;
}

/**
 * Valida el corpus completo. Devuelve los problemas que el esquema por sí
 * solo no puede ver: referencias cruzadas, ids duplicados, coherencia.
 */
export function validateCorpus(
  entries: unknown[],
  categoryIds: string[],
  contributorIds: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed: Entry[] = [];
  const seen = new Set<string>();

  for (const raw of entries) {
    const result = EntrySchema.safeParse(raw);
    if (!result.success) {
      const id = (raw as { id?: string })?.id ?? "sin-id";
      for (const e of result.error.issues) {
        issues.push({ id, message: `${e.path.join(".")}: ${e.message}` });
      }
      continue;
    }
    const entry = result.data;
    if (seen.has(entry.id)) {
      issues.push({ id: entry.id, message: "id duplicado" });
    }
    seen.add(entry.id);
    parsed.push(entry);
  }

  for (const entry of parsed) {
    for (const c of entry.categories) {
      if (!categoryIds.includes(c)) {
        issues.push({ id: entry.id, message: `categoría inexistente: ${c}` });
      }
    }
    for (const c of entry.contributors) {
      if (!contributorIds.includes(c)) {
        issues.push({ id: entry.id, message: `contribuyente inexistente: ${c}` });
      }
    }
    for (const r of entry.related) {
      if (!seen.has(r)) {
        issues.push({ id: entry.id, message: `related apunta a un id que no existe: ${r}` });
      }
      if (r === entry.id) {
        issues.push({ id: entry.id, message: "related se apunta a sí misma" });
      }
    }
    if (entry.epistemicStatus !== "unverified" && entry.categories.length === 0) {
      issues.push({ id: entry.id, message: "sin categoría; solo las 'unverified' pueden estarlo" });
    }
    if (entry.epistemicStatus === "fact" && entry.sources.length === 0) {
      issues.push({ id: entry.id, message: "estado 'fact' sin ninguna fuente" });
    }
    if (entry.epistemicStatus === "unverified" && entry.sources.length > 0) {
      issues.push({ id: entry.id, message: "tiene fuentes pero sigue marcada 'unverified'" });
    }
    const words = entry.content.trim().split(/\s+/).length;
    if (words > 180) {
      issues.push({ id: entry.id, message: `contenido demasiado largo (${words} palabras, máx. 180)` });
    }
  }

  return issues;
}
