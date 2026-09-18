import { describe, expect, it } from 'vitest';

import { SOURCE_KIND_LABEL } from '../lib/labels';
import { EPISTEMIC_STATUS, SourceSchema } from '../lib/schema';
import { STATUS_BORDER } from '../ui/lib/epistemic';

describe('el estado epistémico en el borde', () => {
  it('cada estado del esquema tiene su borde', () => {
    expect(Object.keys(STATUS_BORDER).sort()).toEqual([...EPISTEMIC_STATUS].sort());
  });

  it('reproduce la tabla de docs/DESIGN.md', () => {
    expect(STATUS_BORDER.fact).toMatchObject({ rule: 'solid', width: 1, tone: 'text' });
    expect(STATUS_BORDER.hypothesis).toMatchObject({ rule: 'dashed', width: 1 });
    expect(STATUS_BORDER.speculation).toMatchObject({ rule: 'dashed', width: 1 });
    expect(STATUS_BORDER.interpretation).toMatchObject({ rule: 'solid', width: 1, tone: 'dim' });
    expect(STATUS_BORDER.fiction).toMatchObject({ rule: 'double', width: 3 });
    expect(STATUS_BORDER.controversial).toMatchObject({ rule: 'dotted', width: 1 });
    expect(STATUS_BORDER.unverified).toMatchObject({ rule: 'none', width: 0 });
  });

  it('solo lo pendiente de verificar usa el acento, y ningún estado usa color propio', () => {
    for (const [status, border] of Object.entries(STATUS_BORDER)) {
      expect(border.accentLabel).toBe(status === 'unverified');
      expect(['text', 'dim']).toContain(border.tone);
    }
  });
});

describe('la clase de una fuente', () => {
  it('cada clase del esquema se lee en español en el expediente', () => {
    expect(Object.keys(SOURCE_KIND_LABEL).sort()).toEqual([...SourceSchema.shape.kind.options].sort());
  });
});
