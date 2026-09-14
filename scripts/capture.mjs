#!/usr/bin/env node
/**
 * Captura en menos de un minuto. No pide categorías, ni puntuaciones, ni
 * fuentes: eso es trabajo editorial y se hace después, desde /pendientes.
 * Aquí solo se trata de que una idea de las dos de la mañana no se pierda.
 *
 *   npm run capture
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const DIR = path.join(process.cwd(), "content", "entries");

const nextId = () => {
  const max = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .reduce((m, f) => Math.max(m, Number(f.slice(7, 11))), 0);
  return `delyra-${String(max + 1).padStart(4, "0")}`;
};

const rl = readline.createInterface({ input, output });
const ask = async (q, fallback = "") => (await rl.question(q)).trim() || fallback;

const title = await ask("título · ");
if (!title) {
  console.log("sin título, nada que guardar.");
  rl.close();
  process.exit(0);
}

const content = await ask("qué es, en dos líneas · ");
const hint = await ask("de dónde viene (autor, obra, link, o nada) · ");
const question = await ask("la pregunta que deja abierta · ");
const tags = (await ask("tags, separados por coma · "))
  .split(",")
  .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
  .filter(Boolean);

rl.close();

const id = nextId();
const entry = {
  id,
  title,
  type: "anomaly",
  categories: [],
  tags,
  content: content || "PENDIENTE: redactar entre 60 y 140 palabras.",
  question: question || "PENDIENTE: una pregunta abierta.",
  sources: [],
  epistemicStatus: "unverified",
  scores: { strangeness: 3, darkness: 3, fictionality: 3 },
  sensitive: false,
  related: [],
  addedAt: new Date().toISOString().slice(0, 10),
  captureNote: hint || undefined,
};

fs.writeFileSync(
  path.join(DIR, `${id}.json`),
  JSON.stringify(entry, null, 2) + "\n",
  "utf8",
);

console.log(`\n${id} guardada como pendiente de verificar.`);
console.log(`  content/entries/${id}.json`);
console.log(`  git add . && git commit -m "entrada: ${title}"`);
