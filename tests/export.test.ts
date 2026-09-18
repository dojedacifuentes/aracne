import { describe, expect, it } from 'vitest';

import { loadArchive } from '../lib/content/loader';
import { buildPdf, wrap, textWidth } from '../lib/export/pdf';
import { entrySheet, invocationSheet, sheetPdf, sheetText } from '../lib/export/sheet';
import { invoke } from '../lib/oracle/invoke';
import { bridgeText, dictumText, faultText } from '../ui/lib/copy';

const { corpus } = loadArchive();
const categoryName = (id: string) => corpus.categories.find((c) => c.id === id)?.name;
const entry = corpus.entries[0];

const decode = (bytes: Uint8Array) => {
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
};

describe('la hoja', () => {
  it('el texto crudo lleva lo que se ve en pantalla', () => {
    const sheet = entrySheet(entry, corpus);
    const texto = sheetText(sheet);
    expect(texto).toContain(entry.title);
    expect(texto).toContain(entry.content);
    expect(texto).toContain(entry.question);
    // Y de dónde salió, que es lo que permite volver a encontrarlo.
    expect(texto).toContain(`/e/${entry.id}`);
  });

  it('no lleva firma, porque el archivo no la lleva', () => {
    const texto = sheetText(entrySheet(entry, corpus));
    expect(texto.toLowerCase()).not.toContain('generado por');
    expect(texto).toContain('archivo sin firma');
  });

  // Las dos siguientes fabrican su propia entrada en vez de buscarla en el
  // archivo: la cola editorial puede quedarse vacía, y la hoja tiene que seguir
  // diciendo lo que dice el día que vuelva a haber una pendiente.
  it('dice el estado epistémico cuando no es un hecho', () => {
    const dudosa = { ...entry, epistemicStatus: 'unverified' as const, sources: [] };
    expect(sheetText(entrySheet(dudosa, corpus))).toContain('pendiente de verificar');
  });

  it('una entrada sin fuentes lo dice en vez de callarlo', () => {
    const sinFuentes = { ...entry, sources: [] };
    expect(sheetText(entrySheet(sinFuentes, corpus))).toContain('sin fuentes verificadas');
  });

  it('la hoja de una invocación trae el dictamen y todo lo que salió', () => {
    const invocation = invoke(corpus.entries, 'k3x9q2ab', ['logica']);
    expect(invocation).not.toBeNull();
    const sheet = invocationSheet(
      invocation!,
      corpus,
      dictumText(invocation!, categoryName),
      bridgeText(invocation!, categoryName),
      faultText(invocation!),
    );
    const texto = sheetText(sheet);
    expect(texto).toContain(dictumText(invocation!, categoryName));
    for (const e of invocation!.entries) expect(texto).toContain(e.title);
    expect(sheet.filename).toBe('aracne-k3x9q2ab');
  });
});

describe('el pdf', () => {
  const sheet = entrySheet(entry, corpus);
  const bytes = buildPdf(sheetPdf(sheet));
  const crudo = decode(bytes);

  it('es un pdf de verdad: cabecera, objetos y final', () => {
    expect(crudo.startsWith('%PDF-1.4')).toBe(true);
    expect(crudo.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(crudo).toContain('/Type/Catalog');
    expect(crudo).toContain('/Type/Pages');
    expect(crudo).toContain('/BaseFont/Times-Roman');
  });

  it('la tabla de referencias apunta a donde está cada objeto', () => {
    // Si un desplazamiento falla por un byte, el lector no abre el archivo.
    // Ojo: startxref también contiene «xref», así que la tabla se busca por
    // el salto de línea que la precede.
    const xref = crudo.lastIndexOf(String.fromCharCode(10) + 'xref') + 1;
    const lineas = crudo.slice(xref).split(String.fromCharCode(10));
    const total = Number.parseInt(lineas[1].split(' ')[1], 10);
    expect(total).toBeGreaterThan(5);
    for (let i = 1; i < total; i += 1) {
      const offset = Number.parseInt(lineas[2 + i].slice(0, 10), 10);
      expect(crudo.slice(offset, offset + 12), `objeto ${i}`).toContain(`${i} 0 obj`);
    }
    const startxref = Number.parseInt(crudo.slice(crudo.lastIndexOf('startxref') + 10), 10);
    expect(crudo.slice(startxref, startxref + 4)).toBe('xref');
  });

  it('el texto va dentro y los acentos no se pierden', () => {
    // WinAnsi: la eñe y las vocales acentuadas caen en Latin-1.
    const conAcento = corpus.entries.find((e) => /[áéíóúñ]/i.test(e.title));
    if (!conAcento) return;
    const otro = decode(buildPdf(sheetPdf(entrySheet(conAcento, corpus))));
    const esperado = conAcento.title.normalize('NFC');
    let latin = '';
    for (const ch of esperado) latin += String.fromCharCode(ch.codePointAt(0)! < 256 ? ch.codePointAt(0)! : 63);
    expect(otro).toContain(latin.slice(0, 12));
  });

  it('los paréntesis del texto no rompen el archivo', () => {
    const roto = buildPdf({
      title: 'prueba',
      footer: 'pie',
      blocks: [{ kind: 'body', text: 'esto (lleva) paréntesis y una \\ barra' }],
    });
    const texto = decode(roto);
    expect(texto).toContain('\\(lleva\\)');
    expect(texto).toContain('\\\\ barra');
  });

  it('cada entrada del archivo cabe en su PDF sin reventar', () => {
    for (const e of corpus.entries.slice(0, 12)) {
      const salida = buildPdf(sheetPdf(entrySheet(e, corpus)));
      expect(salida.length, e.id).toBeGreaterThan(900);
    }
  });
});

describe('el ajuste de línea', () => {
  const style = { font: 'F1' as const, size: 11, leading: 16, before: 0 };

  it('ninguna línea se sale de la caja', () => {
    const ancho = 467;
    for (const e of corpus.entries.slice(0, 10)) {
      for (const linea of wrap(e.content, style, ancho)) {
        expect(textWidth(linea, style), e.id).toBeLessThanOrEqual(ancho);
      }
    }
  });

  it('no se pierde ni se inventa una palabra', () => {
    const texto = corpus.entries[0].content;
    const lineas = wrap(texto, style, 300);
    expect(lineas.join(' ').split(/\s+/)).toEqual(texto.split(/\s+/).filter(Boolean));
  });

  it('una palabra más larga que la caja no cuelga el bucle', () => {
    const largo = 'a'.repeat(400);
    expect(wrap(largo, style, 100)).toEqual([largo]);
  });
});
