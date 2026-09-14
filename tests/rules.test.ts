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
