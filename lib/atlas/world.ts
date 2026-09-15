import { z } from "zod";

import { readCountry, type Reading, type Rule } from "./score";

/**
 * El modelo del Atlas de la extinción.
 *
 * Dos archivos y ninguna base de datos, como el resto del archivo:
 * `content/atlas/world.json` —geometría y atributos reales, de Natural
 * Earth— y `content/atlas/causes.json` —las causas y sus reglas—. El cruce de
 * los dos no se guarda: se calcula, porque un score guardado a mano es un
 * score que nadie puede discutir.
 */

export const CountrySchema = z.object({
  /** ISO 3166-1 alfa-3, o el código de Natural Earth cuando no hay ISO. */
  id: z.string().min(2),
  name: z.string().min(1),
  continent: z.string().min(1),
  subregion: z.string().min(1),
  pop: z.number().nonnegative(),
  popYear: z.number().nullable(),
  gdp: z.number(),
  economy: z.string(),
  income: z.string(),
  lon: z.number(),
  lat: z.number(),
  /** Superficie aproximada en km², calculada desde la propia geometría. */
  area: z.number().nonnegative(),
  /** Piezas de costa: de aquí sale la insularidad. */
  parts: z.number().int().positive(),
  /** Anillos, en pares lon/lat planos. */
  rings: z.array(z.array(z.number())).min(1),
});

export const WorldSchema = z.object({
  source: z.object({
    name: z.string().min(1),
    url: z.string().url(),
    license: z.string().min(1),
    note: z.string().min(1),
  }),
  simplified: z.object({
    algorithm: z.string(),
    epsilon: z.number(),
    decimals: z.number(),
    minSpan: z.number(),
  }),
  countries: z.array(CountrySchema).min(100),
});

export const FactorSchema = z.object({
  kind: z.enum([
    "poblacion",
    "densidad",
    "superficie",
    "renta",
    "industria",
    "tropical",
    "polar",
    "insular",
    "continental",
    "arsenal",
  ]),
  weight: z.number().min(-100).max(100),
});

export const CauseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /** Qué ocurre. Una frase. */
  premise: z.string().min(40),
  /** Qué significa aquí «extinción»: biológica, cultural o de la conciencia. */
  terminal: z.string().min(40),
  /** El texto del atlas: 60–140 palabras, como una entrada del archivo. */
  literary: z.string().min(200),
  /** Cómo se reparte el score. La regla es pública: el mapa la enseña. */
  rule: z.object({ base: z.number().min(0).max(100), factors: z.array(FactorSchema) }),
  /**
   * Una causa uniforme le toca igual a todo el mundo: el asteroide no
   * distingue fronteras. **Quedan fuera del reparto de la causa dominante**,
   * porque si entraran el mapa entero diría lo mismo —«asteroide, 100»— y un
   * mapa que dice lo mismo en todas partes no es un mapa. Se enseñan aparte,
   * como el fondo sobre el que ocurre el resto.
   */
  uniform: z.boolean().default(false),

  /** Patas del anillo con las que esta causa cruza. */
  categories: z.array(z.string()).default([]),
  /**
   * Tags del archivo con los que cruza. Tienen que existir ya en alguna
   * entrada: el Atlas no inventa vocabulario, lo usa.
   */
  tags: z.array(z.string()).default([]),
  /**
   * De dónde sale la idea. Obras reales, citadas como inspiración y nunca
   * como aval: el escenario es de este Atlas, no de quien lo inspiró.
   */
  inspiration: z
    .array(z.object({ label: z.string().min(1), author: z.string().optional(), year: z.string().optional() }))
    .default([]),
});

export type Country = z.infer<typeof CountrySchema>;
export type World = z.infer<typeof WorldSchema>;
export type Cause = z.infer<typeof CauseSchema>;

export interface Atlas {
  world: World;
  causes: Cause[];
}

export interface CauseReading extends Reading {
  cause: Cause;
}

/** Todas las lecturas de un país, de la que más quema a la que menos. */
export function readAll(country: Country, causes: readonly Cause[]): CauseReading[] {
  return causes
    .map((cause) => ({ cause, ...readCountry(country, cause.rule as Rule) }))
    .sort((a, b) => b.score - a.score || a.cause.id.localeCompare(b.cause.id));
}

/**
 * La causa dominante y el score general de un país: **el máximo, nunca la
 * suma**. Sumar scores de causas que se excluyen entre sí daría un número sin
 * significado; el máximo dice lo único que se puede decir, que es por dónde le
 * llegaría antes.
 */
export function dominant(country: Country, causes: readonly Cause[]): CauseReading | null {
  const reparto = readAll(country, causes).filter((lectura) => !lectura.cause.uniform);
  return reparto[0] ?? null;
}

/** El fondo: lo que le toca igual a todo el mundo, y por tanto no lo distingue. */
export function background(causes: readonly Cause[]): Cause[] {
  return causes.filter((cause) => cause.uniform);
}

/** Los cinco tramos del calor. */
export const HEAT_BANDS = 5;

/**
 * Por debajo de esto no hay a quién exponer: bases científicas, islas de
 * investigación, territorios sin población estable. El Atlas no los puntúa,
 * y decirlo es más honesto que pintarlos de un color cualquiera.
 */
export const MIN_POPULATION = 10_000;

export function scored(country: Country): boolean {
  return country.pop >= MIN_POPULATION;
}

export interface HeatScale {
  /** Cuatro cortes, cinco tramos. */
  cuts: number[];
}

/**
 * La escala del calor, por cuantiles y no por números redondos.
 *
 * Con cortes fijos —35, 55, 75, 90— ciento veinte países caían en el mismo
 * tramo y el mapa salía de un solo color: los scores se apilan donde se
 * apilan, no donde uno querría. Repartiendo por quintiles, cada tramo lleva
 * aproximadamente una quinta parte del mundo y el dibujo vuelve a decir algo.
 *
 * La escala se recalcula con cada lente, así que la leyenda tiene que enseñar
 * sus cortes: una rampa sin sus números es una mancha bonita.
 */
export function heatScale(scores: readonly number[]): HeatScale {
  const ordenados = [...scores].sort((a, b) => a - b);
  if (ordenados.length === 0) return { cuts: [20, 40, 60, 80] };
  const corte = (p: number) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * p))];
  const crudos = [corte(0.2), corte(0.4), corte(0.6), corte(0.8)];
  // Dos cortes iguales dejarían un tramo vacío: se separan al menos un punto.
  const cuts: number[] = [];
  for (const c of crudos) cuts.push(Math.max(c, (cuts[cuts.length - 1] ?? -1) + 1));
  return { cuts };
}

export function bandOf(score: number, scale: HeatScale): number {
  let banda = 0;
  for (const corte of scale.cuts) if (score >= corte) banda += 1;
  return banda;
}
