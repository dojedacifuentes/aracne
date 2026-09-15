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
import { themeStates } from "../lib/museum/themes";
import { CauseSchema, WorldSchema, dominant, type Cause } from "../lib/atlas/world";
import { entriesForCause } from "../lib/atlas/bridge";
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
  themes: readJson(path.join(CONTENT, "themes.json")),
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
const linked = corpus.figures.filter((figure) => figure.works.length > 0).length;
console.log(
  `${corpus.figures.length} biografías · ${corpus.themes.length} temas · ${drawn} emblemas dibujados · ${linked} con obra enlazada`,
);
// Los temas se calculan desde las figuras, igual que las patas desde las entradas.
for (const state of themeStates(corpus.figures, corpus.themes)) {
  const ligadas = state.entries.length > 0 ? `${state.entries.length} entradas` : "sin entradas ligadas";
  console.log(`  ${state.theme.name.padEnd(30)}${String(state.figures.length).padStart(3)}   ${ligadas}`);
}

// ── El Atlas de la extinción ──────────────────────────────────────────────
// Sus puntuaciones son ficción, pero la ficción también se valida: si una
// causa no reparte, el mapa entero sale del mismo color y deja de ser un mapa.
const rawWorld = readJson(path.join(CONTENT, "atlas", "world.json"));
const rawCauses = readJson(path.join(CONTENT, "atlas", "causes.json"));
const worldParsed = WorldSchema.safeParse(rawWorld);
if (!worldParsed.success) {
  for (const issue of worldParsed.error.issues) {
    issues.push({ id: "atlas/world.json", message: issue.path.join(".") + ": " + issue.message });
  }
} else if (Array.isArray(rawCauses)) {
  const causes: Cause[] = [];
  rawCauses.forEach((raw, index) => {
    const parsed = CauseSchema.safeParse(raw);
    if (parsed.success) causes.push(parsed.data);
    else {
      const id = (raw as { id?: string })?.id ?? `causas[${index}]`;
      for (const issue of parsed.error.issues) {
        issues.push({ id, message: `causa: ${issue.path.join(".")}: ${issue.message}` });
      }
    }
  });

  const world = worldParsed.data;
  const legIds = new Set(corpus.categories.map((c) => c.id));
  const tagIds = new Set(corpus.entries.flatMap((entry) => entry.tags));
  const vistos = new Set<string>();
  for (const cause of causes) {
    if (vistos.has(cause.id)) issues.push({ id: cause.id, message: "causa duplicada" });
    vistos.add(cause.id);
    for (const leg of cause.categories) {
      if (!legIds.has(leg)) issues.push({ id: cause.id, message: `pata inexistente: ${leg}` });
    }
    for (const tag of cause.tags) {
      if (!tagIds.has(tag)) {
        issues.push({ id: cause.id, message: `tag que no existe en ninguna entrada: ${tag}` });
      }
    }
    if (entriesForCause(cause, corpus.entries).length === 0) {
      warnings.push({ id: cause.id, message: "no cruza con ninguna entrada del archivo" });
    }
    if (cause.uniform && cause.rule.factors.length > 0) {
      issues.push({ id: cause.id, message: "una causa uniforme no puede tener factores" });
    }
    const palabras = cause.literary.trim().split(/\s+/).length;
    if (palabras < 60 || palabras > 140) {
      warnings.push({ id: cause.id, message: `texto de ${palabras} palabras (se piden 60-140)` });
    }
    // La prueba de que la regla reparte: entre el percentil 5 y el 99 tiene
    // que haber al menos veinticinco puntos. Si no, esa causa no dice nada
    // de nadie y está ocupando sitio.
    //
    // El techo era el percentil 95 y se subió al pasar el mundo de 177 a 242
    // territorios. El motivo no es que la medida estorbara: es que **dejaba
    // fuera justo aquello de lo que habla la causa**. La guerra nuclear separa
    // a nueve países por cincuenta puntos; con 242 territorios esos nueve son
    // el 3,7 %, o sea, por encima del percentil 95, así que la ventana medía
    // solo el pelotón —plano, como debe ser— y declaraba que la regla no
    // repartía. Con el percentil 99 hacen falta al menos cuatro territorios
    // separados del resto, que sigue siendo «distingue a alguien» y no «le
    // toca a uno por casualidad».
    if (!cause.uniform) {
      const valores = world.countries
        .map((country) => dominant(country, [cause])?.score ?? 0)
        .sort((a, b) => a - b);
      const p5 = valores[Math.floor(valores.length * 0.05)];
      const p99 = valores[Math.floor(valores.length * 0.99)];
      if (p99 - p5 < 25) {
        issues.push({ id: cause.id, message: `la regla no reparte: de ${p5} a ${p99} en todo el mundo` });
      }
    }
  }

  const reparto = new Map<string, number>();
  const generales: number[] = [];
  for (const country of world.countries) {
    const top = dominant(country, causes);
    if (!top) continue;
    reparto.set(top.cause.id, (reparto.get(top.cause.id) ?? 0) + 1);
    generales.push(top.score);
  }
  generales.sort((a, b) => a - b);
  console.log(
    `${world.countries.length} territorios · ${causes.length} causas (${causes.filter((c) => c.uniform).length} uniformes) · ` +
      `${reparto.size} causas dominantes · scores de ${generales[0]} a ${generales[generales.length - 1]}`,
  );
  // El Atlas se anunció con treinta causas: puede tener más, nunca menos.
  if (causes.length < 30) {
    issues.push({ id: "atlas", message: `solo hay ${causes.length} causas y el Atlas se anunció con treinta` });
  }
}

for (const warning of warnings) console.warn(`aviso  ${warning.id}  ${warning.message}`);

if (issues.length > 0) {
  for (const issue of issues) console.error(`error  ${issue.id}  ${issue.message}`);
  console.error(`\n${issues.length} errores: el build no sigue.`);
  process.exit(1);
}
