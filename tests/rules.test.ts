import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['lib', 'ui', 'scripts', 'content'];

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mjs|js)$/.test(item.name) ? [full] : [];
  });
}

/** Los comentarios pueden nombrar la regla; el código no puede romperla. */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('reglas duras de CLAUDE.md', () => {
  it('toda la aleatoriedad pasa por el PRNG sembrado', () => {
    const random = new RegExp(['Math', 'random'].join('\\.') + '\\s*\\(');
    const offenders = ROOTS.flatMap(sourceFiles).filter((file) =>
      random.test(withoutComments(fs.readFileSync(file, 'utf8'))),
    );
    expect(offenders).toEqual([]);
  });
});

describe('tipografía', () => {
  /**
   * Había once tamaños de letra puestos a ojo, pantalla por pantalla, y por eso
   * el conjunto no sonaba afinado. Ahora los cuerpos viven en ui/theme.ts y en
   * ningún otro sitio: un `fontSize` suelto vuelve a desafinarlo.
   */
  it('ningún componente escribe un cuerpo, un interlineado o un tracking a mano', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles('ui')) {
      if (file.endsWith('theme.ts')) continue;
      const source = withoutComments(fs.readFileSync(file, 'utf8'));
      for (const property of ['fontSize', 'lineHeight', 'letterSpacing']) {
        // String.raw: en una plantilla normal, \b es un retroceso y no un
        // límite de palabra, y la comprobación pasaría siempre sin mirar nada.
        const match = new RegExp(String.raw`\b` + property + ': [0-9]').exec(source);
        if (match) offenders.push(`${file}: ${property}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('los cuerpos son los siete de theme.ts, sin duplicados', () => {
    const theme = fs.readFileSync(path.join('ui', 'theme.ts'), 'utf8');
    const sizes = [...theme.matchAll(/fontSize: ([0-9]+)/g)].map((m) => Number(m[1]));
    expect(sizes).toHaveLength(7);
    expect(new Set(sizes).size).toBe(7);
    // Cada cuerpo trae su interlineado: dos bloques vecinos no pueden discrepar.
    expect([...theme.matchAll(/lineHeight: ([0-9]+)/g)]).toHaveLength(7);
  });
});
