import { prisma } from '../database/prisma.js';
import { generateEmbedding } from './embeddings.js';
import { extractKeywords } from './ranking.js';
import { MemoryMetadata, MessageRole } from '../types/index.js';

// Common tech / product entities for metadata tagging
const KNOWN_ENTITIES = [
  'postgresql', 'postgres', 'neon', 'supabase', 'render', 'railway', 'aws rds',
  'hubspot', 'salesforce', 'pipedrive', 'zoho', 'freshsales', 'crm',
  'openai', 'gpt-4', 'gemini', 'anthropic', 'claude', 'tavily',
  'pricing', 'price', 'plan', 'shortlist', 'free tier', 'storage', 'bandwidth'
];

/**
 * Extracts entities and structured metadata from message content.
 */
export function extractMetadata(content: string, role: MessageRole): MemoryMetadata {
  const contentLower = content.toLowerCase();
  const matchedEntities: string[] = [];

  for (const entity of KNOWN_ENTITIES) {
    if (contentLower.includes(entity)) {
      matchedEntities.push(entity);
    }
  }

  const isQuestion = content.includes('?') ||
    /^(what|when|where|which|who|how|why|is|can|does|has|could)\b/i.test(content.trim());
  const isShortlist = contentLower.includes('shortlist') || contentLower.includes('shortlisted');
  const pricingMentioned = contentLower.includes('pricing') || contentLower.includes('price') ||
    contentLower.includes('$') || contentLower.includes('/mo') || contentLower.includes('per month');

  return {
    entities: matchedEntities,
    topics: extractKeywords(content).slice(0, 8),
    role,
    isQuestion,
    isShortlist,
    pricingMentioned,
  };
}

/**
 * Stores a message in the database and creates an indexed memory record with embeddings.
 */
export async function storeMessageWithMemory(params: {
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt?: Date;
  id?: string;
}) {
  const { conversationId, role, content, createdAt = new Date(), id } = params;

  // 1. Create message
  const message = await prisma.message.create({
    data: {
      ...(id ? { id } : {}),
      conversationId,
      role,
      content,
      createdAt,
    },
  });

  // 2. Generate embedding for memory representation
  const embedding = await generateEmbedding(content);

  // 3. Extract metadata
  const metadata = extractMetadata(content, role);

  // 4. Save memory record
  const memory = await prisma.memory.create({
    data: {
      conversationId,
      messageId: message.id,
      content,
      embedding: JSON.stringify(embedding),
      metadata: JSON.stringify(metadata),
      createdAt,
    },
  });

  // 5. Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { message, memory };
}
