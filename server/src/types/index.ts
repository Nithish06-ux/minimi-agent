export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface MemoryMetadata {
  entities?: string[];
  topics?: string[];
  dates?: string[];
  role?: MessageRole;
  isQuestion?: boolean;
  isShortlist?: boolean;
  pricingMentioned?: boolean;
  [key: string]: unknown;
}

export interface MemoryRecord {
  id: string;
  conversationId: string;
  messageId?: string | null;
  content: string;
  embedding: number[];
  metadata?: MemoryMetadata;
  createdAt: Date;
}

export interface MemorySearchResult {
  memory: MemoryRecord;
  semanticScore: number;
  keywordScore: number;
  temporalScore: number;
  conversationScore: number;
  finalScore: number;
}

export interface ResolvedDateRange {
  originalText: string;
  startDateUtc: Date;
  endDateUtc: Date;
  timezone: string;
  isExact: boolean;
  description: string;
}

export interface IntentAnalysis {
  isMemoryQuery: boolean;
  isFollowUp: boolean;
  isComparisonQuery: boolean;
  requiresWebSearch: boolean;
  temporalReference?: ResolvedDateRange | null;
  extractedEntities: string[];
  extractedTopics: string[];
  coreferenceTarget?: string | null;
  suggestedSearchQueries: string[];
  reasoning: string;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  content: string;
  publishedDate?: string | null;
  score?: number;
  isOfficial?: boolean;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResultItem[];
  retrievedAt: Date;
  error?: string;
}

export type ComparisonClassification =
  | 'Changed'
  | 'Unchanged'
  | 'New information'
  | 'Removed'
  | 'Unverified'
  | 'Not comparable';

export interface EntityClaim {
  entity: string;
  aspect: string; // e.g. "pricing", "feature", "limits", "version"
  claim: string;
  price?: {
    amount?: number;
    currency?: string;
    billingPeriod?: 'monthly' | 'annual' | 'one-time' | 'custom';
    seatCount?: number | string;
    planName?: string;
    rawText: string;
  };
  features?: string[];
  sourceText: string;
  date?: string;
}

export interface ComparisonResult {
  id?: string;
  entity: string;
  aspect: string;
  historicalClaim: string;
  currentClaim: string;
  classification: ComparisonClassification;
  explanation: string;
  confidence: number;
  sourceUrl?: string | null;
  evidenceSnippets?: string[];
}

export interface ResearchEvidenceItem {
  id?: string;
  title: string;
  url: string;
  content: string;
  publishedAt?: string | null;
  retrievedAt: Date;
  associatedClaim?: string | null;
  isOfficial: boolean;
}

export interface AgentStepTrace {
  step: number;
  type: 'intent_analysis' | 'memory_retrieval' | 'web_search' | 'evidence_analysis' | 'historical_comparison' | 'response_generation';
  description: string;
  data?: unknown;
  timestamp: string;
}

export interface AgentExecutionResult {
  response: string;
  conversationId: string;
  messageId: string;
  retrievedMemories: MemorySearchResult[];
  researchEvidence: ResearchEvidenceItem[];
  comparisons: ComparisonResult[];
  steps: AgentStepTrace[];
  isWebSearched: boolean;
  modelUsed: string;
}
