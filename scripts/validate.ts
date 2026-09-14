/**
 * npm run validate
 *
 * Valida el archivo completo y escribe `content/index.generated.ts`, la lista
 * de entradas que importa la aplicación: Metro no puede leer una carpeta en
 * tiempo de ejecución. Cada entrada sigue siendo su propio archivo.
 *
 * Una entrada inválida hace fallar el build, nunca la aplicación.
 */
import fs from "node:fs";
import path from "node:path";

import { legStates, parseCorpus } from "../lib/content/corpus";
import { roomStates } from "../lib/museum/rooms";
import type { ValidationIssue } from "../lib/schema";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const ENTRIES = path.join(CONTENT, "entries");
const INDEX = path.join(CONTENT, "index.generated.ts");

const issues: ValidationIssue[] = [];
const warnings: ValidationIssue[] = [];

const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));

const files = fs
  .readdirSync(ENTRIES)
  .filter((file) => file.endsWith(".json"))
  .sort();

const rawEntries: unknown[] = [];
const readable: string[] = [];
for (const file of files) {
  try {
    const data = readJson(path.join(ENTRIES, file));
    const id = (data as { id?: unknown } | null)?.id;
    if (`${String(id)}.json` !== file) {
      issues.push({ id: file, message: `el nombre del archivo no coincide con el id (${String(id)})` });
    }
    rawEntries.push(data);
    readable.push(file);
  } catch (error) {
    issues.push({ id: file, message: `JSON ilegible: ${(error as Error).message}` });
  }
}

const { corpus, issues: corpusIssues } = parseCorpus({
  entries: rawEntries,
  categories: readJson(path.join(CONTENT, "categories.json")),
  figures: readJson(path.join(CONTENT, "figures.json")),
  rooms: readJson(path.join(CONTENT, "rooms.json")),
});
issues.push(...corpusIssues);

// Reglas de CLAUDE.md que el esquema no puede expresar. Avisan; no detienen.
const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
for (const entry of corpus.entries) {
  const words = entry.content.trim().split(/\s+/).length;
  if (words < 60 || words > 140) {
    warnings.push({ id: entry.id, message: `contenido de ${words} palabras (CLAUDE.md pide 60–140)` });
  }
  for (const tag of entry.tags) {
    if (!TAG.test(tag)) warnings.push({ id: entry.id, message: `tag con formato irregular: ${tag}` });
  }
  if ((entry.question.match(/\?/g) ?? []).length > 1) {
    warnings.push({ id: entry.id, message: "la pregunta parece contener más de una pregunta" });
  }
}

// El índice solo enumera lo legible: un JSON roto no debe tumbar el bundler.
const index = [
  "// Generado por scripts/validate.ts en cada `npm run validate`. No editar.",
  "// Cada entrada vive en su propio archivo de content/entries/; esto solo las enumera.",
  ...readable.map((file, i) => `import e${i} from "./entries/${file}";`),
  "",
  `export const RAW_ENTRIES: unknown[] = [${readable.map((_, i) => `e${i}`).join(", ")}];`,
  "",
].join("\n");
if (!fs.existsSync(INDEX) || fs.readFileSync(INDEX, "utf8") !== index) {
  fs.writeFileSync(INDEX, index, "utf8");
}

const legs = legStates(corpus.entries, corpus.categories);
const lit = legs.filter((leg) => leg.visible).length;

console.log(
  `${corpus.entries.length} entradas válidas · ${lit} categorías visibles · ${legs.length - lit} retraídas`,
);
for (const leg of legs) {
  const state = leg.visible ? "" : `   retraída, faltan ${leg.missing}`;
  console.log(`  ${leg.category.glyph}  ${leg.category.name.padEnd(32)}${String(leg.count).padStart(3)}${state}`);
}
const drawn = corpus.figures.filter((figure) =>
  fs.existsSync(path.join(ROOT, "public", "figures", `${figure.id}.svg`)),
).length;
console.log(
  `${corpus.figures.length} figuras · ${corpus.rooms.length} salas · ${drawn} emblemas dibujados`,
);
// Las salas se calculan desde las figuras, igual que las patas desde las entradas.
for (const state of roomStates(corpus.figures, corpus.rooms)) {
  const linked = state.entries.length > 0 ? `${state.entries.length} entradas` : "sin entradas ligadas";
  console.log(`  ${state.room.name.padEnd(42)}${String(state.figures.length).padStart(3)}   ${linked}`);
}

for (const warning of warnings) console.warn(`aviso  ${warning.id}  ${warning.message}`);

if (issues.length > 0) {
  for (const issue of issues) console.error(`error  ${issue.id}  ${issue.message}`);
  console.error(`\n${issues.length} errores: el build no sigue.`);
  process.exit(1);
}
