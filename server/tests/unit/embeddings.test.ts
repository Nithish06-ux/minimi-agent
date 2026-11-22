import { describe, it, expect } from 'vitest';
import { cosineSimilarity, generateMockEmbedding } from '../../src/memory/embeddings.js';

describe('Embeddings & Similarity Unit Tests', () => {
  it('computes exact cosine similarity for identical vectors', () => {
    const vecA = [0.6, 0.8];
    const vecB = [0.6, 0.8];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(1.0, 5);
  });

  it('computes 0 for orthogonal vectors', () => {
    const vecA = [1.0, 0.0];
    const vecB = [0.0, 1.0];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(0.0, 5);
  });

  it('computes -1 for opposing vectors', () => {
    const vecA = [1.0, 0.0];
    const vecB = [-1.0, 0.0];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(-1.0, 5);
  });

  it('mock embedding generator produces unit vectors', () => {
    const vec = generateMockEmbedding('PostgreSQL hosting plans and pricing comparison');
    expect(vec.length).toBe(1536);
    let norm = 0;
    for (const v of vec) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);
  });

  it('mock embeddings yield higher similarity for related texts than unrelated texts', () => {
    const vecPostgres1 = generateMockEmbedding('PostgreSQL database hosting on Neon');
    const vecPostgres2 = generateMockEmbedding('Postgres database pricing and cloud storage');
    const vecCooking = generateMockEmbedding('Italian pizza dough yeast and tomato sauce recipe');

    const simRelated = cosineSimilarity(vecPostgres1, vecPostgres2);
    const simUnrelated = cosineSimilarity(vecPostgres1, vecCooking);

    expect(simRelated).toBeGreaterThan(simUnrelated);
  });
});
