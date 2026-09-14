/** Fuerza la presentación como texto: sin esto, Windows pinta ♒ como un emoji. */
export const textGlyph = (glyph: string) => glyph + String.fromCharCode(0xfe0e);
