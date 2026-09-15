import type { Country } from "./world";

/**
 * El motor del Atlas.
 *
 * Los scores del Atlas son **ficción declarada**, pero no se escriben a mano:
 * se calculan. Cada causa trae una regla —una base y unos factores con su
 * peso— y la regla se aplica a atributos con procedencia (Natural Earth:
 * población, superficie, renta, latitud, número de piezas de costa). Así, un
 * país no puntúa alto porque alguien lo haya decidido, sino porque la regla lo
 * dice, y la ficha puede enseñar la cuenta entera.
 *
 * Esto es lo mismo que hace el resto del proyecto: una categoría se enciende
 * sola al llegar a tres entradas, un vínculo existe porque el grafo lo
 * encuentra. Aquí un país arde porque su regla lo quema.
 *
 * Sin `Math.random`: la misma regla y el mismo país dan siempre lo mismo.
 */

/**
 * Los nueve Estados que poseen armas nucleares. Es el único dato del Atlas que
 * no sale de Natural Earth, y es un hecho comprobable, no una opinión: lo
 * publican la Federation of American Scientists y el anuario del SIPRI.
 * Se usa solo como entrada de una regla; el Atlas no dice nada sobre ellos.
 */
export const NUCLEAR_STATES = ["USA", "RUS", "CHN", "FRA", "GBR", "IND", "PAK", "ISR", "PRK"] as const;

/** Las entradas que una regla puede leer. Ni una más: lo que no se pueda medir, no puntúa. */
export const FACTOR_KINDS = [
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
] as const;

export type FactorKind = (typeof FACTOR_KINDS)[number];

export interface Factor {
  kind: FactorKind;
  /** Cuánto suma —o resta— este factor cuando vale 1. */
  weight: number;
}

export interface Rule {
  /** Lo que le toca a todo el mundo por el mero hecho de existir. */
  base: number;
  factors: Factor[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Rampa lineal entre dos valores: 0 por debajo de `a`, 1 por encima de `b`. */
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

/** El primer número de «3. Upper middle income» o «1. Developed region: G7». */
const grupo = (texto: string): number => {
  const n = Number.parseInt(texto.trim().charAt(0), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Cada factor, normalizado de 0 a 1. Las escalas son logarítmicas donde el
 * mundo real lo es: entre el país menos poblado y el más poblado hay cinco
 * órdenes de magnitud, y una escala lineal convertiría a todos menos a dos en
 * el mismo número.
 */
export function factorValue(kind: FactorKind, country: Country): number {
  const lat = Math.abs(country.lat);
  switch (kind) {
    case "poblacion":
      return country.pop <= 0 ? 0 : ramp(Math.log10(country.pop), 4, 9.2);
    case "densidad": {
      if (country.area <= 0 || country.pop <= 0) return 0;
      return ramp(Math.log10(country.pop / country.area), -1, 3);
    }
    case "superficie":
      return country.area <= 0 ? 0 : ramp(Math.log10(country.area), 3, 7.2);
    case "renta": {
      // 1 es renta alta. Se invierte: el factor mide cuán tecnificado está.
      const g = grupo(country.income);
      return g === 0 ? 0.5 : clamp01((5 - g) / 4);
    }
    case "industria": {
      const g = grupo(country.economy);
      return g === 0 ? 0.5 : clamp01((7 - g) / 6);
    }
    case "tropical":
      // Pleno en el trópico, nada pasados los 35 grados.
      return 1 - ramp(lat, 23.5, 35);
    case "polar":
      return ramp(lat, 50, 70);
    case "insular":
      // Un país con muchas piezas de costa tiene el mar por todas partes.
      return ramp(Math.log10(country.parts + 1), 0.3, 1.5);
    case "continental":
      return 1 - ramp(Math.log10(country.parts + 1), 0.3, 1.5);
    case "arsenal":
      return (NUCLEAR_STATES as readonly string[]).includes(country.id) ? 1 : 0;
  }
}

export interface Contribution {
  kind: FactorKind;
  /** Lo que este factor aportó al score, ya redondeado. */
  delta: number;
}

export interface Reading {
  score: number;
  base: number;
  /** De mayor a menor aportación, para poder decir por qué arde un país. */
  parts: Contribution[];
}

/**
 * La lectura de un país bajo una causa: el número y la cuenta que lo produce.
 * Un score que no se pueda explicar no vale nada en un atlas.
 */
export function readCountry(country: Country, rule: Rule): Reading {
  const parts = rule.factors.map((factor) => ({
    kind: factor.kind,
    delta: Math.round(factor.weight * factorValue(factor.kind, country)),
  }));
  const bruto = rule.base + parts.reduce((sum, part) => sum + part.delta, 0);
  return {
    score: Math.max(0, Math.min(100, Math.round(bruto))),
    base: rule.base,
    parts: [...parts].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
  };
}

export function scoreCountry(country: Country, rule: Rule): number {
  return readCountry(country, rule).score;
}
