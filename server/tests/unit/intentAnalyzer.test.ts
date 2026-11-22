import { describe, it, expect } from 'vitest';
import { analyzeIntent } from '../../src/agent/intentAnalyzer.js';

describe('Intent Analyzer Unit Tests', () => {
  it('classifies general knowledge queries without search or memory', () => {
    const intent = analyzeIntent('What is a database index?');
    expect(intent.isMemoryQuery).toBe(false);
    expect(intent.requiresWebSearch).toBe(false);
    expect(intent.isComparisonQuery).toBe(false);
  });

  it('classifies exact date query as memory query without initial search', () => {
    const intent = analyzeIntent('What did I ask you on 3 November?');
    expect(intent.isMemoryQuery).toBe(true);
    expect(intent.temporalReference).not.toBeNull();
    expect(intent.temporalReference?.isExact).toBe(true);
  });

  it('classifies "is your answer still correct today?" as requiring web search', () => {
    const intent = analyzeIntent('What did I ask you on 3 November? Is your answer still correct today?');
    expect(intent.isMemoryQuery).toBe(true);
    expect(intent.requiresWebSearch).toBe(true);
    expect(intent.isComparisonQuery).toBe(true);
  });

  it('classifies historical pricing question as requiring memory, search, and comparison', () => {
    const intent = analyzeIntent('Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?');
    expect(intent.isMemoryQuery).toBe(true);
    expect(intent.requiresWebSearch).toBe(true);
    expect(intent.isComparisonQuery).toBe(true);
    expect(intent.temporalReference?.originalText).toBe('last tuesday');
  });

  it('resolves coreference for follow-up: "which one is cheaper?"', () => {
    const history = [
      { role: 'user', content: 'Compare Supabase and Neon pricing' },
      { role: 'assistant', content: 'Supabase is $25/mo while Neon is $19/mo base.' },
    ];
    const intent = analyzeIntent('Which one is cheaper?', history);
    expect(intent.isFollowUp).toBe(true);
    expect(intent.isMemoryQuery).toBe(true);
    expect(intent.coreferenceTarget).toContain('neon');
  });
});
