/**
 * Un PDF, escrito a mano.
 *
 * Exportar los textos en PDF no justifica una dependencia: un PDF de texto es
 * un formato de los años noventa que cabe en doscientas líneas, y las catorce
 * fuentes base —Times, Courier, Helvetica— están en todos los lectores, así
 * que no hay que incrustar nada. La alternativa era meter medio megabyte de
 * librería en un paquete que ya pesa 1,9 MB.
 *
 * Puro: entra una estructura de bloques y sale un `Uint8Array`. Se puede
 * probar sin navegador, y de hecho se prueba.
 */

export type PdfBlock =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "body"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "rule" }
  | { kind: "space" };

export interface PdfDoc {
  title: string;
  /** Va al pie de cada página, en Courier pequeño. */
  footer: string;
  blocks: PdfBlock[];
}

/** A4 en puntos, que es la unidad del formato. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 64;
const WIDTH = PAGE_W - MARGIN * 2;

/**
 * Anchos de Times-Roman en milésimas de em, de los propios metrics del
 * formato. Sin esto el ajuste de línea sería a ojo y las líneas se saldrían
 * del papel.
 */
const TIMES: Record<string, number> = {
  ' ': 250, '!': 333, '"': 408, '#': 500, $: 500, '%': 833, '&': 778, "'": 333,
  '(': 333, ')': 333, '*': 500, '+': 564, ',': 250, '-': 333, '.': 250, '/': 278,
  '0': 500, '1': 500, '2': 500, '3': 500, '4': 500, '5': 500, '6': 500, '7': 500,
  '8': 500, '9': 500, ':': 278, ';': 278, '<': 564, '=': 564, '>': 564, '?': 444,
  '@': 921, A: 722, B: 667, C: 667, D: 722, E: 611, F: 556, G: 722, H: 722,
  I: 333, J: 389, K: 722, L: 611, M: 889, N: 722, O: 722, P: 556, Q: 722,
  R: 667, S: 556, T: 611, U: 722, V: 722, W: 944, X: 722, Y: 722, Z: 611,
  '[': 333, '\\': 278, ']': 333, '^': 469, _: 500, '`': 333,
  a: 444, b: 500, c: 444, d: 500, e: 444, f: 333, g: 500, h: 500, i: 278,
  j: 278, k: 500, l: 278, m: 778, n: 500, o: 500, p: 500, q: 500, r: 333,
  s: 389, t: 278, u: 500, v: 500, w: 722, x: 500, y: 500, z: 444,
  '{': 480, '|': 200, '}': 480, '~': 541,
};

const COURIER_WIDTH = 600;

interface Style {
  font: "F1" | "F2" | "F3";
  size: number;
  /** Alto de línea, en puntos. */
  leading: number;
  /** Aire por encima del bloque. */
  before: number;
}

const STYLES: Record<Exclude<PdfBlock["kind"], "rule" | "space">, Style> = {
  title: { font: "F3", size: 20, leading: 26, before: 0 },
  heading: { font: "F3", size: 12, leading: 17, before: 18 },
  meta: { font: "F2", size: 8, leading: 12, before: 4 },
  body: { font: "F1", size: 11, leading: 16, before: 10 },
  quote: { font: "F1", size: 11, leading: 17, before: 10 },
};

/** Ancho de un texto, en puntos. */
export function textWidth(text: string, style: Style): number {
  let total = 0;
  for (const ch of text) {
    total += style.font === "F2" ? COURIER_WIDTH : (TIMES[ch] ?? 500);
  }
  return (total * style.size) / 1000;
}

/** Parte un párrafo en líneas que caben. Nunca corta una palabra por la mitad. */
export function wrap(text: string, style: Style, width: number): string[] {
  const palabras = text.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra;
    if (actual && textWidth(intento, style) > width) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = intento;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length > 0 ? lineas : [""];
}

/**
 * De Unicode a WinAnsi, que es lo que entienden las fuentes base. Las
 * vocales acentuadas y la eñe caen en su sitio por Latin-1; las comillas y
 * las rayas tipográficas hay que llevarlas a mano, o salen como cuadrados.
 */
const WINANSI: Record<string, number> = {
  "—": 0x97, "–": 0x96, "‘": 0x91, "’": 0x92,
  "“": 0x93, "”": 0x94, "…": 0x85, "•": 0x95,
  "€": 0x80, "‹": 0x8b, "›": 0x9b,
};

function encode(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = WINANSI[ch] ?? ch.codePointAt(0) ?? 63;
    const byte = code < 256 ? code : 63; // lo que no cabe, interrogación
    const char = String.fromCharCode(byte);
    out += char === "(" || char === ")" || char === "\\" ? `\\${char}` : char;
  }
  return out;
}

interface Line {
  text: string;
  style: Style;
  /** Distancia desde la línea anterior. */
  gap: number;
  rule?: boolean;
}

/** Convierte los bloques en líneas ya ajustadas al ancho de la caja. */
function layout(blocks: readonly PdfBlock[]): Line[] {
  const lineas: Line[] = [];
  for (const block of blocks) {
    if (block.kind === "rule") {
      lineas.push({ text: "", style: STYLES.meta, gap: 14, rule: true });
      continue;
    }
    if (block.kind === "space") {
      lineas.push({ text: "", style: STYLES.meta, gap: 10 });
      continue;
    }
    const style = STYLES[block.kind];
    const ancho = block.kind === "quote" ? WIDTH - 24 : WIDTH;
    wrap(block.text, style, ancho).forEach((texto, i) => {
      lineas.push({ text: texto, style, gap: i === 0 ? style.before + style.leading : style.leading });
    });
  }
  return lineas;
}

/** El PDF entero, listo para guardar. */
export function buildPdf(doc: PdfDoc): Uint8Array {
  const lineas = layout(doc.blocks);
  const paginas: string[] = [];
  let contenido = "";
  let y = PAGE_H - MARGIN;

  const cerrar = () => {
    const pie = `BT /F2 8 Tf ${MARGIN} ${MARGIN - 24} Td (${encode(doc.footer)}) Tj ET\n`;
    paginas.push(contenido + pie);
    contenido = "";
    y = PAGE_H - MARGIN;
  };

  for (const linea of lineas) {
    if (y - linea.gap < MARGIN + 12) cerrar();
    y -= linea.gap;
    if (linea.rule) {
      contenido += `0.55 0.52 0.49 RG 0.5 w ${MARGIN} ${y + 4} m ${PAGE_W - MARGIN} ${y + 4} l S\n`;
      continue;
    }
    if (!linea.text) continue;
    const x = linea.style === STYLES.quote ? MARGIN + 24 : MARGIN;
    contenido += `BT /${linea.style.font} ${linea.style.size} Tf 0.93 0.92 0.89 rg ${x} ${y} Td (${encode(linea.text)}) Tj ET\n`;
  }
  cerrar();

  // Los objetos, en orden. Las páginas y sus contenidos van al final porque
  // sus números dependen de cuántas hayan salido.
  const objetos: string[] = [];
  const kids = paginas.map((_, i) => `${6 + i * 2} 0 R`).join(" ");
  objetos.push(`<</Type/Catalog/Pages 2 0 R>>`);
  objetos.push(`<</Type/Pages/Kids[${kids}]/Count ${paginas.length}>>`);
  objetos.push(`<</Type/Font/Subtype/Type1/BaseFont/Times-Roman/Encoding/WinAnsiEncoding>>`);
  objetos.push(`<</Type/Font/Subtype/Type1/BaseFont/Courier/Encoding/WinAnsiEncoding>>`);
  objetos.push(`<</Type/Font/Subtype/Type1/BaseFont/Times-Bold/Encoding/WinAnsiEncoding>>`);
  for (const [i, pagina] of paginas.entries()) {
    objetos.push(
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PAGE_W} ${PAGE_H}]` +
        `/Resources<</Font<</F1 3 0 R/F2 4 0 R/F3 5 0 R>>>>/Contents ${7 + i * 2} 0 R>>`,
    );
    objetos.push(`<</Length ${pagina.length}>>\nstream\n${pagina}endstream`);
  }

  let salida = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((cuerpo, i) => {
    offsets.push(salida.length);
    salida += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });
  const xref = salida.length;
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) salida += `${String(offset).padStart(10, "0")} 00000 n \n`;
  salida += `trailer\n<</Size ${objetos.length + 1}/Root 1 0 R/Info<</Title(${encode(doc.title)})>>>>\n`;
  salida += `startxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(salida.length);
  for (let i = 0; i < salida.length; i += 1) bytes[i] = salida.charCodeAt(i) & 0xff;
  return bytes;
}
