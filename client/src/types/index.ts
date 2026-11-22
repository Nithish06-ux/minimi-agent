export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface EvidenceItem {
  id?: string;
  title: string;
  url: string;
  content: string;
  publishedAt?: string | null;
  retrievedAt: string;
  associatedClaim?: string | null;
  isOfficial?: boolean;
}

export type ComparisonClassification =
  | 'Changed'
  | 'Unchanged'
  | 'New information'
  | 'Removed'
  | 'Unverified'
  | 'Not comparable';

export interface Comparison {
  id?: string;
  entity: string;
  aspect: string;
  historicalClaim: string;
  currentClaim: string;
  classification: ComparisonClassification;
  explanation: string;
  confidence: number;
  sourceUrl?: string | null;
}

export interface AgentStep {
  step: number;
  type: 'intent_analysis' | 'memory_retrieval' | 'web_search' | 'evidence_analysis' | 'historical_comparison' | 'response_generation';
  description: string;
  data?: unknown;
  timestamp: string;
}

export interface MemoryResult {
  memory: {
    id: string;
    conversationId: string;
    content: string;
    createdAt: string;
  };
  finalScore: number;
}

export interface ChatResponsePayload {
  response: string;
  conversationId: string;
  messageId: string;
  retrievedMemories: MemoryResult[];
  researchEvidence: EvidenceItem[];
  comparisons: Comparison[];
  steps: AgentStep[];
  isWebSearched: boolean;
  modelUsed: string;
}
