import type { Corpus } from "../content/corpus";
import { catalogId, STATUS_LABEL, TYPE_LABEL } from "../labels";
import type { Invocation } from "../oracle/invoke";
import type { Entry } from "../schema";

import type { PdfBlock, PdfDoc } from "./pdf";

/**
 * Lo que sale de aquí es lo mismo que se ve en pantalla, en texto.
 *
 * Dos formas y una sola fuente: `sheet()` compone una hoja —título, líneas y
 * bloques— y de ella salen tanto el texto crudo como el PDF. Si se hicieran
 * por separado, en dos semanas dirían cosas distintas.
 *
 * El archivo no lleva firma, así que lo exportado tampoco: ni autor, ni marca
 * de agua, ni «generado por». Lo único que se añade es de dónde salió y con
 * qué semilla, que es lo que permite volver a encontrarlo.
 */

export interface Sheet {
  title: string;
  /** La línea de debajo del título: identificadores y estado. */
  meta: string;
  blocks: PdfBlock[];
  /** Nombre del archivo, sin extensión. */
  filename: string;
}

const nombre = (corpus: Corpus, id: string) =>
  corpus.categories.find((category) => category.id === id)?.name ?? id;

/** El estado epistémico se dice siempre que no sea un hecho (CLAUDE.md). */
const estado = (entry: Entry) =>
  entry.epistemicStatus === "fact" ? "" : ` · ${STATUS_LABEL[entry.epistemicStatus]}`;

function entryBlocks(entry: Entry, corpus: Corpus): PdfBlock[] {
  const patas = entry.categories.map((id) => nombre(corpus, id)).join(" · ");
  const bloques: PdfBlock[] = [
    { kind: "heading", text: entry.title },
    { kind: "meta", text: `${catalogId(entry.id)} · ${TYPE_LABEL[entry.type]} · ${patas}${estado(entry)}` },
    { kind: "body", text: entry.content },
    { kind: "quote", text: entry.question },
  ];
  if (entry.tags.length > 0) {
    bloques.push({ kind: "meta", text: `tags: ${entry.tags.join(", ")}` });
  }
  for (const source of entry.sources) {
    const partes = [source.label, source.author, source.work, source.year, source.url].filter(Boolean);
    bloques.push({ kind: "meta", text: `fuente: ${partes.join(", ")}` });
  }
  if (entry.sources.length === 0) {
    bloques.push({ kind: "meta", text: "sin fuentes verificadas" });
  }
  return bloques;
}

/** La hoja de una invocación: el dictamen, lo que salió y por qué. */
export function invocationSheet(
  invocation: Invocation,
  corpus: Corpus,
  dictum: string,
  bridge: string,
  fault: string,
): Sheet {
  const blocks: PdfBlock[] = [
    { kind: "title", text: dictum },
    { kind: "meta", text: `${invocation.shape} · semilla ${invocation.seed} · /i/${invocation.seed}` },
    { kind: "rule" },
  ];
  for (const entry of invocation.entries) {
    blocks.push(...entryBlocks(entry, corpus), { kind: "space" });
  }
  if (invocation.entries.length > 1) {
    blocks.push({ kind: "rule" }, { kind: "heading", text: "lo que las une" }, { kind: "body", text: bridge });
    blocks.push({ kind: "heading", text: "lo que las separa" }, { kind: "body", text: fault });
  }
  return {
    title: `aracne · ${invocation.shape} · ${invocation.seed}`,
    meta: `${invocation.entries.length} entradas`,
    blocks,
    filename: `aracne-${invocation.seed}`,
  };
}

/** La hoja de una entrada suelta. */
export function entrySheet(entry: Entry, corpus: Corpus): Sheet {
  return {
    title: `aracne · ${entry.title}`,
    meta: catalogId(entry.id),
    blocks: [
      { kind: "title", text: entry.title },
      { kind: "meta", text: `${catalogId(entry.id)} · /e/${entry.id}` },
      { kind: "rule" },
      ...entryBlocks(entry, corpus).slice(1),
    ],
    filename: `aracne-${entry.id}`,
  };
}

/**
 * El texto crudo de una hoja. Sin adornos de marco ni arte ASCII: lo que se
 * pega en otro sitio tiene que poder leerse en otro sitio.
 */
export function sheetText(sheet: Sheet): string {
  const lineas: string[] = [];
  for (const block of sheet.blocks) {
    switch (block.kind) {
      case "rule":
        lineas.push("", "---", "");
        break;
      case "space":
        lineas.push("");
        break;
      case "title":
        lineas.push(block.text, "");
        break;
      case "heading":
        lineas.push("", block.text);
        break;
      case "quote":
        lineas.push("", `> ${block.text}`);
        break;
      default:
        lineas.push(block.text);
    }
  }
  lineas.push("", "---", "aracne · archivo sin firma · aracne-mu.vercel.app");
  return lineas.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function sheetPdf(sheet: Sheet): PdfDoc {
  return {
    title: sheet.title,
    footer: "aracne · archivo sin firma · aracne-mu.vercel.app",
    blocks: sheet.blocks,
  };
}
