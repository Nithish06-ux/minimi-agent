import { IntentAnalysis, ResolvedDateRange } from '../types/index.js';
import { resolveDateRange } from '../memory/dateResolver.js';
import { extractKeywords } from '../memory/ranking.js';

const MEMORY_TRIGGERS = [
  'what did i ask',
  'i asked you',
  'we discussed',
  'shortlisted',
  'shortlist',
  'last tuesday',
  'on monday',
  'november',
  'yesterday',
  'previous conversation',
  'earlier',
  'before',
  'is that still',
  'is your answer still',
  'has any of them',
  'has anything changed',
  'since then',
  'which one is',
];

const SEARCH_TRIGGERS = [
  'changed pricing',
  'pricing change',
  'shipped',
  'new feature',
  'still correct today',
  'still correct',
  'current pricing',
  'has any pricing changed',
  'latest',
  'update',
  'recent',
  'news',
  'today',
];

const GENERAL_KNOWLEDGE_PATTERNS = [
  /^what is (?:a|an|the)?\s*[a-z\s]+$/i,
  /^explain (?:how|what|why)\s+[a-z\s]+$/i,
  /^difference between\s+[a-z\s]+$/i,
  /^how does [a-z\s]+ work$/i,
];

/**
 * Analyzes the intent of the incoming user message.
 */
export function analyzeIntent(
  query: string,
  recentHistory: Array<{ role: string; content: string }> = [],
  referenceDateUtc: Date = new Date()
): IntentAnalysis {
  const queryLower = query.toLowerCase().trim();

  // 1. Resolve date expressions
  const temporalReference: ResolvedDateRange | null = resolveDateRange(query, referenceDateUtc);

  // 2. Check if general knowledge query without need for search or past memory
  const isGeneralKnowledge = GENERAL_KNOWLEDGE_PATTERNS.some(p => p.test(queryLower));

  // 3. Determine if past memory context is needed
  let isMemoryQuery = MEMORY_TRIGGERS.some(t => queryLower.includes(t)) || !!temporalReference;
  const isFollowUp = queryLower.startsWith('which one') ||
    queryLower.includes('is that') ||
    queryLower.includes('has any of them') ||
    (recentHistory.length > 0 && queryLower.length < 30);

  if (isFollowUp) {
    isMemoryQuery = true;
  }

  // 4. Determine if web search is needed
  let requiresWebSearch = SEARCH_TRIGGERS.some(t => queryLower.includes(t));
  if (isGeneralKnowledge && !requiresWebSearch) {
    requiresWebSearch = false;
    isMemoryQuery = false;
  }

  // If asking "is your answer still correct today?" -> requires web search!
  if (queryLower.includes('still correct') || queryLower.includes('changed since')) {
    requiresWebSearch = true;
  }

  // 5. Determine if comparison is needed
  const isComparisonQuery = requiresWebSearch && (isMemoryQuery || queryLower.includes('changed') || queryLower.includes('difference'));

  // 6. Extract entities and topics
  const extractedTopics = extractKeywords(query);
  const candidateEntities = [
    'hubspot', 'salesforce', 'pipedrive', 'zoho', 'freshsales',
    'neon', 'supabase', 'render', 'railway', 'aws rds',
    'postgresql', 'postgres', 'crm'
  ];
  const extractedEntities = candidateEntities.filter(e => queryLower.includes(e));

  // Coreference resolution: if asking "which one is cheaper" or "has any of them changed", inspect recent history
  let coreferenceTarget: string | null = null;
  if (queryLower.includes('which one') || queryLower.includes('of them') || queryLower.includes('is that')) {
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      const histLower = recentHistory[i].content.toLowerCase();
      const matched = candidateEntities.filter(e => histLower.includes(e));
      if (matched.length > 0) {
        coreferenceTarget = matched.join(', ');
        break;
      }
    }
  }

  // Generate suggested search queries
  const suggestedSearchQueries: string[] = [];
  if (requiresWebSearch) {
    if (extractedEntities.length > 0) {
      for (const ent of extractedEntities) {
        if (queryLower.includes('pricing') || queryLower.includes('price')) {
          suggestedSearchQueries.push(`${ent} pricing plans 2026`);
        }
        if (queryLower.includes('shipped') || queryLower.includes('big') || queryLower.includes('update')) {
          suggestedSearchQueries.push(`${ent} changelog new features release updates 2026`);
        }
      }
    } else if (coreferenceTarget) {
      const targets = coreferenceTarget.split(', ');
      for (const t of targets) {
        suggestedSearchQueries.push(`${t} pricing official`);
      }
    } else {
      suggestedSearchQueries.push(query);
    }
  }

  return {
    isMemoryQuery,
    isFollowUp,
    isComparisonQuery,
    requiresWebSearch,
    temporalReference,
    extractedEntities,
    extractedTopics,
    coreferenceTarget,
    suggestedSearchQueries: Array.from(new Set(suggestedSearchQueries)).slice(0, 5),
    reasoning: `Memory needed: ${isMemoryQuery}, Web search needed: ${requiresWebSearch}, Comparison: ${isComparisonQuery}`,
  };
}
