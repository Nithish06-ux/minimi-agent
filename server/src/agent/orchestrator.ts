import { prisma } from '../database/prisma.js';
import { storeMessageWithMemory } from '../memory/storage.js';
import { retrieveRelevantMemories } from '../memory/retrieval.js';
import { analyzeIntent } from './intentAnalyzer.js';
import { ToolExecutor } from './toolExecutor.js';
import { buildEvidenceItems, detectEvidenceConflicts } from '../research/evidence.js';
import { compareHistoricalAndCurrent } from '../research/comparison.js';
import { generateAgentResponse } from './responseGenerator.js';
import {
  AgentExecutionResult,
  AgentStepTrace,
  ComparisonResult,
  ResearchEvidenceItem
} from '../types/index.js';
import { config } from '../config.js';

export interface ExecuteAgentOptions {
  conversationId?: string;
  message: string;
  referenceDateUtc?: Date;
  onStep?: (step: AgentStepTrace) => void;
}

/**
 * Master Agent Orchestrator.
 * Controls the controlled agent loop across memory retrieval, web search,
 * evidence extraction, historical comparison, and response generation.
 */
export async function executeAgent(options: ExecuteAgentOptions): Promise<AgentExecutionResult> {
  const {
    conversationId: providedConvId,
    message,
    referenceDateUtc = new Date(),
    onStep,
  } = options;

  const steps: AgentStepTrace[] = [];
  const logStep = (type: AgentStepTrace['type'], description: string, data?: unknown) => {
    const stepObj: AgentStepTrace = {
      step: steps.length + 1,
      type,
      description,
      data,
      timestamp: new Date().toISOString(),
    };
    steps.push(stepObj);
    if (onStep) {
      onStep(stepObj);
    }
    console.log(`[Agent Step ${stepObj.step}] [${type}] ${description}`);
  };

  // 1. Ensure conversation exists
  let conversationId = providedConvId;
  if (!conversationId) {
    const newConv = await prisma.conversation.create({
      data: {
        title: message.slice(0, 40) || 'New Research Session',
      },
    });
    conversationId = newConv.id;
  } else {
    // Check if exists
    const existing = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!existing) {
      const created = await prisma.conversation.create({
        data: {
          id: conversationId,
          title: message.slice(0, 40) || 'New Research Session',
        },
      });
      conversationId = created.id;
    }
  }

  // 2. Fetch recent conversation history for coreference resolution
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const recentHistory = recentMessages.reverse().map(m => ({ role: m.role, content: m.content }));

  // 3. Persist user message and generate embedding
  await storeMessageWithMemory({
    conversationId,
    role: 'user',
    content: message,
    createdAt: referenceDateUtc,
  });

  // STEP 1: Intent Analysis
  logStep('intent_analysis', 'Analyzing user intent, temporal references, and search requirements');
  const intent = analyzeIntent(message, recentHistory, referenceDateUtc);

  // STEP 2: Memory Retrieval
  let retrievedMemories: import('../types/index.js').MemorySearchResult[] = [];
  let isMissingMemoryRequested = false;

  if (intent.isMemoryQuery || intent.isComparisonQuery) {
    logStep('memory_retrieval', `Searching conversation memory (Temporal reference: ${intent.temporalReference?.description || 'None'})`);
    const memResult = await retrieveRelevantMemories({
      query: message,
      conversationId,
      referenceDateUtc,
      limit: 5,
    });
    retrievedMemories = memResult.memories;

    if (intent.temporalReference && retrievedMemories.length === 0) {
      isMissingMemoryRequested = true;
    }
  }

  // STEP 3: Controlled Web Search Execution
  const toolExecutor = new ToolExecutor();
  const evidenceItems: ResearchEvidenceItem[] = [];

  if (intent.requiresWebSearch) {
    logStep('web_search', `Executing web search research for queries: ${intent.suggestedSearchQueries.join(', ')}`);

    for (const q of intent.suggestedSearchQueries) {
      if (toolExecutor.getExecutionCount() >= config.MAX_WEB_SEARCHES_PER_REQUEST) {
        break;
      }
      const searchRes = await toolExecutor.runWebSearch(q);
      if (searchRes && searchRes.results.length > 0) {
        const items = buildEvidenceItems(searchRes.results, q);
        evidenceItems.push(...items);
      }
    }
  }

  // STEP 4: Evidence Analysis & Conflict Detection
  if (evidenceItems.length > 0) {
    const conflicts = detectEvidenceConflicts(evidenceItems);
    logStep('evidence_analysis', `Analyzed ${evidenceItems.length} evidence sources. Identified ${conflicts.length} potential conflicts.`);
  }

  // STEP 5: Historical vs Current Comparison
  let comparisons: ComparisonResult[] = [];
  if (intent.isComparisonQuery && retrievedMemories.length > 0 && evidenceItems.length > 0) {
    logStep('historical_comparison', 'Comparing historical claims against current verified evidence');
    const historicalText = retrievedMemories.map(m => m.memory.content).join('\n\n');
    comparisons = compareHistoricalAndCurrent({
      historicalText,
      evidenceItems,
      userQuery: message,
    });
  }

  // STEP 6: Response Generation
  logStep('response_generation', 'Generating evidence-backed response with verified citations');
  const responseText = generateAgentResponse({
    userQuery: message,
    isComparison: intent.isComparisonQuery,
    retrievedMemories,
    evidenceItems,
    comparisons,
    missingMemoryRequested: isMissingMemoryRequested,
    modelUsed: config.OPENAI_MODEL,
  });

  // STEP 7: Persist Assistant Response & Session Data
  const { message: assistantMsg } = await storeMessageWithMemory({
    conversationId,
    role: 'assistant',
    content: responseText,
    createdAt: new Date(),
  });

  // If research was performed, persist research session, evidence, and comparisons
  if (evidenceItems.length > 0 || comparisons.length > 0) {
    try {
      const session = await prisma.researchSession.create({
        data: {
          conversationId,
          query: message,
          status: 'completed',
        },
      });

      // Persist evidence records
      for (const ev of evidenceItems) {
        await prisma.researchEvidence.create({
          data: {
            researchSessionId: session.id,
            title: ev.title,
            url: ev.url,
            content: ev.content,
            publishedAt: ev.publishedAt,
            associatedClaim: ev.associatedClaim,
            isOfficial: ev.isOfficial,
          },
        });
      }

      // Persist comparisons
      for (const comp of comparisons) {
        await prisma.comparison.create({
          data: {
            researchSessionId: session.id,
            entity: comp.entity,
            aspect: comp.aspect,
            historicalClaim: comp.historicalClaim,
            currentClaim: comp.currentClaim,
            classification: comp.classification,
            explanation: comp.explanation,
            confidence: comp.confidence,
            sourceUrl: comp.sourceUrl,
          },
        });
      }
    } catch (dbErr) {
      console.error('[AgentOrchestrator] Error persisting research records:', dbErr);
    }
  }

  return {
    response: responseText,
    conversationId,
    messageId: assistantMsg.id,
    retrievedMemories,
    researchEvidence: evidenceItems,
    comparisons,
    steps,
    isWebSearched: evidenceItems.length > 0,
    modelUsed: config.OPENAI_MODEL,
  };
}
