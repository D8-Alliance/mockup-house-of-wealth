import { parseChatResponse } from './ai.provider';

describe('parseChatResponse', () => {
  it('parses a complete JSON answer, including fenced output', () => {
    const result = parseChatResponse('```json\n{"answer":"Zakah base is disclosed [S1].","citations":[{"source":"S1","quote":"The Zakah base should be disclosed"}],"confidence":{"level":"MEDIUM","scorePercent":60},"limitations":[]}\n```');
    expect(result.answer).toBe('Zakah base is disclosed [S1].');
    expect(result.citations).toEqual([{ source: 'S1', quote: 'The Zakah base should be disclosed' }]);
    expect(result.confidence).toEqual({ level: 'MEDIUM', scorePercent: 60 });
  });

  it('salvages the answer and complete citations from JSON cut off at the token limit', () => {
    const truncated = '{"answer":"Losses follow capital [S1]. Zakah base is disclosed [S2].","citations":[{"source":"S1","quote":"Losses are shared in proportion"},{"source":"S2","quote":"The Zakah base sho';
    const result = parseChatResponse(truncated);
    expect(result.answer).toBe('Losses follow capital [S1]. Zakah base is disclosed [S2].');
    expect(result.citations).toEqual([{ source: 'S1', quote: 'Losses are shared in proportion' }]);
    expect(result.limitations?.[0]).toMatch(/cut off/);
  });

  it('salvages an answer that is itself unterminated', () => {
    expect(parseChatResponse('{"answer":"Partial answer about Musharaka [S1] and').answer).toBe('Partial answer about Musharaka [S1] and');
  });

  it('rethrows when nothing can be recovered', () => {
    expect(() => parseChatResponse('not json at all')).toThrow();
  });
});
