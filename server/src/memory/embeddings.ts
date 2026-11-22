import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config.js';

// In-memory cache for embeddings to avoid re-computing for unchanged text
const embeddingCache = new Map<string, number[]>();

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient && config.OPENAI_API_KEY && !config.MOCK_AI) {
    openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Calculates cosine similarity between two float vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates a deterministic mock embedding vector (1536 dims) for offline testing.
 * Uses a token hashing and frequency projection approach so semantically related
 * phrases share common components and yield realistic cosine similarities.
 */
export function generateMockEmbedding(text: string, dimensions = 1536): number[] {
  const normalized = text.toLowerCase().trim();
  const tokens = normalized.split(/\W+/).filter(t => t.length > 0);
  const vector = new Array(dimensions).fill(0);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const hash = crypto.createHash('sha256').update(token).digest();
    // Project token into multiple dimensions
    for (let i = 0; i < 16; i++) {
      const idx = (hash.readUInt16LE(i * 2) % dimensions);
      const sign = (hash[i] % 2 === 0) ? 1 : -1;
      vector[idx] += sign * (1 + (token.length / 10));
    }
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * Generates semantic embedding for input text.
 * Falls back to deterministic mock embedding if OpenAI is unavailable or in mock mode.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = crypto.createHash('md5').update(text.trim()).digest('hex');
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const client = getOpenAIClient();

  if (!client || config.MOCK_AI) {
    const mockVec = generateMockEmbedding(text);
    embeddingCache.set(cacheKey, mockVec);
    return mockVec;
  }

  try {
    const response = await client.embeddings.create({
      model: config.OPENAI_EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Avoid token limit
    });

    const embedding = response.data[0].embedding;
    embeddingCache.set(cacheKey, embedding);
    return embedding;
  } catch (err) {
    console.warn(`[Embeddings] OpenAI embedding API call failed: ${(err as Error).message}. Falling back to mock embedding.`);
    const fallbackVec = generateMockEmbedding(text);
    embeddingCache.set(cacheKey, fallbackVec);
    return fallbackVec;
  }
}
