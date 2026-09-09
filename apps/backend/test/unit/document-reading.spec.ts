import { parseDocumentReading } from '../../src/modules/ai/ai.module';

const EMPTY = { allergies: [], vaccines: [], medications: [] };

describe('parseDocumentReading', () => {
  describe('when the model behaves', () => {
    it('keeps the three lists and the summary', () => {
      const out = parseDocumentReading(
        JSON.stringify({
          allergies: [{ label: 'Amendoim' }],
          vaccines: [{ name: 'Hexavalente', date: '2026-03-04' }],
          medications: [{ name: 'Amoxicilina', dose: '250 mg' }],
          summary: 'Relatório de consulta de pediatria.',
        }),
      );
      expect(out.allergies).toEqual([{ label: 'Amendoim' }]);
      expect(out.vaccines).toEqual([{ name: 'Hexavalente', date: '2026-03-04' }]);
      expect(out.medications).toEqual([{ name: 'Amoxicilina', dose: '250 mg' }]);
      expect(out.summary).toBe('Relatório de consulta de pediatria.');
    });

    it('reads nothing as empty lists rather than as a failure', () => {
      expect(parseDocumentReading('{"allergies":[],"vaccines":[],"medications":[]}')).toEqual(
        expect.objectContaining(EMPTY),
      );
    });
  });

  // A model asked for JSON will sometimes wrap it. That is a parsing problem,
  // not a reason to lose a document the parent just uploaded.
  describe('when the model is untidy', () => {
    it('survives a ```json fence', () => {
      const out = parseDocumentReading(
        '```json\n{"allergies":[{"label":"Pólen"}],"vaccines":[],"medications":[]}\n```',
      );
      expect(out.allergies).toEqual([{ label: 'Pólen' }]);
    });

    it('survives prose around the object', () => {
      const out = parseDocumentReading(
        'Claro! Aqui está: {"allergies":[],"vaccines":[{"name":"BCG"}],"medications":[]} Espero ter ajudado.',
      );
      expect(out.vaccines).toEqual([{ name: 'BCG' }]);
    });
  });

  // Everything below is the point of the parser: a plausible invention in a
  // child's allergy list is worse than a gap, so anything not clearly valid is
  // dropped rather than passed on for the parent to notice.
  describe('when the model misbehaves', () => {
    it('returns an empty reading for unparseable output', () => {
      for (const bad of ['', 'não consegui ler o documento', '{', '[]', 'null']) {
        expect(parseDocumentReading(bad)).toEqual(expect.objectContaining(EMPTY));
      }
    });

    it('drops entries with no usable name', () => {
      const out = parseDocumentReading(
        JSON.stringify({
          allergies: [{ label: '' }, { label: '   ' }, { note: 'sem label' }, { label: 'Leite' }],
          vaccines: [{ date: '2026-01-01' }],
          medications: [{ dose: '5 ml' }],
        }),
      );
      expect(out.allergies).toEqual([{ label: 'Leite' }]);
      expect(out.vaccines).toEqual([]);
      expect(out.medications).toEqual([]);
    });

    it('drops a date that is not a real ISO day, keeping the vaccine', () => {
      const out = parseDocumentReading(
        JSON.stringify({
          vaccines: [
            { name: 'A', date: 'março de 2026' },
            { name: 'B', date: '2026-13-45' },
            { name: 'C', date: '04/03/2026' },
            { name: 'D', date: '2026-03-04' },
          ],
        }),
      );
      expect(out.vaccines).toEqual([
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
        { name: 'D', date: '2026-03-04' },
      ]);
    });

    it('ignores non-string values instead of stringifying them', () => {
      const out = parseDocumentReading(
        JSON.stringify({
          allergies: [{ label: 42 }, { label: { nested: true } }, { label: ['a'] }],
          medications: [{ name: 'Ibuprofeno', dose: 5 }],
        }),
      );
      expect(out.allergies).toEqual([]);
      expect(out.medications).toEqual([{ name: 'Ibuprofeno' }]);
    });

    it('ignores lists that are not lists', () => {
      const out = parseDocumentReading(
        JSON.stringify({ allergies: 'Amendoim', vaccines: {}, medications: null }),
      );
      expect(out).toEqual(expect.objectContaining(EMPTY));
    });

    it('caps how many entries one document can propose', () => {
      const many = Array.from({ length: 40 }, (_, i) => ({ label: `A${i}` }));
      expect(parseDocumentReading(JSON.stringify({ allergies: many })).allergies).toHaveLength(12);
    });

    it('truncates long text instead of storing an essay in a label', () => {
      const out = parseDocumentReading(
        JSON.stringify({
          allergies: [{ label: 'x'.repeat(500) }],
          summary: 'y'.repeat(1000),
        }),
      );
      expect(out.allergies[0].label).toHaveLength(140);
      expect(out.summary).toHaveLength(300);
    });
  });
});
