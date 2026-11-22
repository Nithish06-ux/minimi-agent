import { MemoryRecord, MemorySearchResult, ResolvedDateRange } from '../types/index.js';
import { cosineSimilarity } from './embeddings.js';

export interface ScoreWeights {
  semantic: number;
  keyword: number;
  temporal: number;
  conversation: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  semantic: 0.45,
  keyword: 0.30,
  temporal: 0.15,
  conversation: 0.10,
};

const TEMPORAL_QUERY_WEIGHTS: ScoreWeights = {
  semantic: 0.30,
  keyword: 0.25,
  temporal: 0.35,
  conversation: 0.10,
};

/**
 * Extracts candidate keywords and key entities from text.
 */
export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokens = normalized.split(/[^a-zA-Z0-9_\-#+.]+/).filter(t => t.length > 2);
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'what', 'when', 'where',
    'which', 'who', 'how', 'why', 'any', 'some', 'has', 'had', 'are', 'was', 'were',
    'been', 'can', 'could', 'would', 'should', 'about', 'did', 'does', 'asked', 'tell'
  ]);
  return Array.from(new Set(tokens.filter(t => !stopWords.has(t))));
}

/**
 * Computes keyword match score between query and memory content/metadata.
 */
export function calculateKeywordScore(query: string, memory: MemoryRecord): number {
  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length === 0) return 0;

  const contentLower = memory.content.toLowerCase();
  const metadataEntities = (memory.metadata?.entities || []).map(e => e.toLowerCase());
  const metadataTopics = (memory.metadata?.topics || []).map(t => t.toLowerCase());

  let matches = 0;
  for (const kw of queryKeywords) {
    if (contentLower.includes(kw)) {
      matches += 1;
    } else if (metadataEntities.some(e => e.includes(kw) || kw.includes(e))) {
      matches += 1.5; // Entity match boost
    } else if (metadataTopics.some(t => t.includes(kw))) {
      matches += 1;
    }
  }

  return Math.min(1.0, matches / Math.max(1, queryKeywords.length * 0.8));
}

/**
 * Calculates temporal relevance score based on resolved date range or recency.
 */
export function calculateTemporalScore(
  memoryDate: Date,
  dateRange: ResolvedDateRange | null | undefined,
  referenceDateUtc: Date = new Date()
): number {
  const memTime = new Date(memoryDate).getTime();

  if (dateRange) {
    const start = dateRange.startDateUtc.getTime();
    const end = dateRange.endDateUtc.getTime();

    // Inside target range -> perfect temporal match
    if (memTime >= start && memTime <= end) {
      return 1.0;
    }

    // Distance in days from boundary
    const distanceMs = memTime < start ? start - memTime : memTime - end;
    const distanceDays = distanceMs / (1000 * 60 * 60 * 24);

    if (distanceDays <= 1) return 0.7;
    if (distanceDays <= 3) return 0.4;
    if (distanceDays <= 7) return 0.2;
    return 0.05;
  }

  // Without explicit date range, apply gentle recency decay
  const ageDays = Math.max(0, (referenceDateUtc.getTime() - memTime) / (1000 * 60 * 60 * 24));
  return Math.max(0.1, 1.0 / (1.0 + ageDays * 0.05));
}

/**
 * Ranks candidate memories using hybrid scoring.
 */
export function rankMemories(
  query: string,
  queryEmbedding: number[],
  candidates: MemoryRecord[],
  options: {
    targetConversationId?: string;
    dateRange?: ResolvedDateRange | null;
    referenceDateUtc?: Date;
    minScoreThreshold?: number;
  } = {}
): MemorySearchResult[] {
  const {
    targetConversationId,
    dateRange,
    referenceDateUtc = new Date(),
    minScoreThreshold = 0.25,
  } = options;

  const weights = dateRange ? TEMPORAL_QUERY_WEIGHTS : DEFAULT_WEIGHTS;

  const scoredResults: MemorySearchResult[] = [];

  for (const memory of candidates) {
    const semanticScore = cosineSimilarity(queryEmbedding, memory.embedding);
    const keywordScore = calculateKeywordScore(query, memory);
    const temporalScore = calculateTemporalScore(memory.createdAt, dateRange, referenceDateUtc);
    
    // Conversation proximity: boost if part of the currently active conversation
    const conversationScore = targetConversationId && memory.conversationId === targetConversationId ? 1.0 : 0.4;

    const finalScore =
      semanticScore * weights.semantic +
      keywordScore * weights.keyword +
      temporalScore * weights.temporal +
      conversationScore * weights.conversation;

    if (finalScore >= minScoreThreshold) {
      scoredResults.push({
        memory,
        semanticScore: Number(semanticScore.toFixed(4)),
        keywordScore: Number(keywordScore.toFixed(4)),
        temporalScore: Number(temporalScore.toFixed(4)),
        conversationScore: Number(conversationScore.toFixed(4)),
        finalScore: Number(finalScore.toFixed(4)),
      });
    }
  }

  // Sort descending by finalScore
  scoredResults.sort((a, b) => b.finalScore - a.finalScore);

  return scoredResults;
}
