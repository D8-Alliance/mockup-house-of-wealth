import { groundAnswer, labelSources, noSourcesAnswer, quoteAppearsIn } from './ai-citations';
import type { RagSearchResult } from './ai.service';

const source = (id: string, content: string): RagSearchResult => ({ id, documentId: `doc-${id}`, content, title: `Doc ${id}`, sourceType: 'AAOIFI_STANDARD', scope: 'GLOBAL', pageStart: 3, pageEnd: 3, paragraphRefs: [] });
const sources = labelSources([
  source('a', 'Losses are shared in proportion to the contributed capital. It is not permissible to stipulate otherwise.'),
  source('b', 'The Zakah base should be disclosed whenever the Islamic bank is obligated to pay such Zakah on behalf of all owners.'),
]);

describe('ai-citations', () => {
  it('labels sources S1..Sn in retrieval order', () => {
    expect(sources.map((item) => item.label)).toEqual(['S1', 'S2']);
  });

  it('verifies quotes verbatim or with minor differences, and rejects invented quotes', () => {
    expect(quoteAppearsIn('losses are shared in proportion to the contributed capital', sources[0].result.content)).toBe(true);
    expect(quoteAppearsIn('“Losses are shared in proportion to the contributed  capital.”', sources[0].result.content)).toBe(true);
    expect(quoteAppearsIn('Losses are shared equally between all partners regardless of capital', sources[0].result.content)).toBe(false);
  });

  it('grounds a fully cited answer, renumbers markers by first appearance, and keeps verified quotes', () => {
    const result = groundAnswer({
      answer: 'The Zakah base must be disclosed when the bank pays Zakah for its owners [S2]. In Musharaka, losses follow each partner\'s capital contribution [s1].',
      citations: [{ source: 'S1', quote: 'Losses are shared in proportion to the contributed capital' }, { source: 'S2', quote: 'The Zakah base should be disclosed' }],
      confidence: { level: 'HIGH', scorePercent: 97 },
    }, sources);
    expect(result.groundingStatus).toBe('GROUNDED');
    expect(result.answer).toContain('owners [1].');
    expect(result.answer).toContain('contribution [2].');
    expect(result.citations.map((c) => [c.marker, c.label, c.quoteVerified])).toEqual([[1, 'S2', true], [2, 'S1', true]]);
    expect(result.confidence.scorePercent).toBe(85);
    expect(result.confidence.level).toBe('HIGH');
  });

  it('drops citations to sources that do not exist and flags uncited statements', () => {
    const result = groundAnswer({
      answer: 'Losses follow capital contributions in a Musharaka partnership [S1]. Profit ratios must always be exactly fifty-fifty between the partners [S9].',
      citations: [{ source: 'S9', quote: 'fifty-fifty' }],
      confidence: { scorePercent: 90 },
    }, sources);
    expect(result.droppedLabels).toEqual(['S9']);
    expect(result.answer).not.toContain('S9');
    expect(result.groundingStatus).toBe('PARTIALLY_GROUNDED');
    expect(result.unsupportedSentences).toHaveLength(1);
    expect(result.confidence.scorePercent).toBeLessThanOrEqual(50);
  });

  it('marks an answer with no valid citations as unsupported, and a fabricated quote as unverified', () => {
    expect(groundAnswer({ answer: 'Musharaka requires every partner to contribute exactly equal capital amounts.', citations: [] }, sources).groundingStatus).toBe('UNSUPPORTED');
    const fabricated = groundAnswer({ answer: 'Losses follow capital [S1].', citations: [{ source: 'S1', quote: 'The partner who manages the business bears all losses personally' }] }, sources);
    expect(fabricated.citations[0].quoteVerified).toBe(false);
    expect(fabricated.groundingStatus).toBe('PARTIALLY_GROUNDED');
  });

  it('does not require citations for disclaimers', () => {
    const result = groundAnswer({ answer: 'Losses are shared by capital [S1]. This is not a Shariah ruling and requires qualified Shariah review.', citations: [{ source: 'S1' }] }, sources);
    expect(result.groundingStatus).toBe('GROUNDED');
  });

  it('has a fixed low-confidence answer when nothing was retrieved', () => {
    const result = noSourcesAnswer();
    expect(result.groundingStatus).toBe('NO_SOURCES');
    expect(result.confidence.scorePercent).toBe(0);
    expect(result.citations).toEqual([]);
  });
});
