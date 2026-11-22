import { prisma } from '../database/prisma.js';
import { generateEmbedding } from './embeddings.js';
import { rankMemories } from './ranking.js';
import { resolveDateRange } from './dateResolver.js';
import { MemoryRecord, MemorySearchResult, ResolvedDateRange } from '../types/index.js';

export interface RetrieveMemoriesOptions {
  conversationId?: string;
  query: string;
  referenceDateUtc?: Date;
  limit?: number;
  isolateConversation?: boolean; // When true, only searches within target conversation
  minScoreThreshold?: number;
}

/**
 * High-precision memory retrieval engine.
 * Combines semantic cosine similarity, keyword/entity overlap, date range filtering,
 * and temporal proximity to return ranked historical memories.
 */
export async function retrieveRelevantMemories(
  options: RetrieveMemoriesOptions
): Promise<{
  memories: MemorySearchResult[];
  resolvedDateRange: ResolvedDateRange | null;
}> {
  const {
    conversationId,
    query,
    referenceDateUtc = new Date(),
    limit = 5,
    isolateConversation = false,
    minScoreThreshold = 0.20,
  } = options;

  // 1. Resolve date expressions in the query
  const dateRange = resolveDateRange(query, referenceDateUtc);

  // 2. Build Prisma database query filters
  const whereClause: Record<string, unknown> = {};

  if (isolateConversation && conversationId) {
    whereClause.conversationId = conversationId;
  }

  // If exact date requested (e.g. "3 November"), apply database timestamp boundary
  if (dateRange?.isExact) {
    whereClause.createdAt = {
      gte: dateRange.startDateUtc,
      lte: dateRange.endDateUtc,
    };
  }

  // 3. Query candidate memories from database
  const rawMemories = await prisma.memory.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 100, // Fetch up to 100 candidates for scoring
  });

  if (rawMemories.length === 0) {
    // If exact date filter returned nothing, check if there are any memories nearby
    return {
      memories: [],
      resolvedDateRange: dateRange,
    };
  }

  // 4. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 5. Parse stored embeddings and format MemoryRecords
  const candidates: MemoryRecord[] = rawMemories.map((m) => {
    let embedding: number[] = [];
    try {
      embedding = JSON.parse(m.embedding);
    } catch {
      embedding = [];
    }

    let metadata = {};
    if (m.metadata) {
      try {
        metadata = JSON.parse(m.metadata);
      } catch {
        metadata = {};
      }
    }

    return {
      id: m.id,
      conversationId: m.conversationId,
      messageId: m.messageId,
      content: m.content,
      embedding,
      metadata,
      createdAt: m.createdAt,
    };
  });

  // 6. Rank candidates
  const ranked = rankMemories(query, queryEmbedding, candidates, {
    targetConversationId: conversationId,
    dateRange,
    referenceDateUtc,
    minScoreThreshold,
  });

  return {
    memories: ranked.slice(0, limit),
    resolvedDateRange: dateRange,
  };
}
