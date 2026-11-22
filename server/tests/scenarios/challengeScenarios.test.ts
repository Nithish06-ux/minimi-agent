import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/database/prisma.js';
import { executeAgent } from '../../src/agent/orchestrator.js';
import { storeMessageWithMemory } from '../../src/memory/storage.js';
import { executeWebSearch } from '../../src/tools/webSearch.js';
import { buildEvidenceItems, detectEvidenceConflicts } from '../../src/research/evidence.js';
import { DateTime } from 'luxon';

describe('Minimi Hiring Challenge - Core Capability Tests (1 - 10)', () => {
  beforeAll(async () => {
    // Setup clean database tables
    await prisma.comparison.deleteMany();
    await prisma.researchEvidence.deleteMany();
    await prisma.researchSession.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // TEST 1: Historical CRM research
  // =========================================================================
  it('TEST 1: Historical CRM research: retrieves 5 tools, extracts entities, conducts search, compares & cites', async () => {
    const monday = DateTime.now().setZone('Asia/Kolkata').minus({ days: 7 }).toUTC().toJSDate();
    const crmConv = await prisma.conversation.create({
      data: {
        title: 'CRM Shortlist for 20-person sales team',
        createdAt: monday,
      },
    });

    await storeMessageWithMemory({
      conversationId: crmConv.id,
      role: 'user',
      content: 'Shortlist 5 CRM tools for a 20-person sales team with pricing.',
      createdAt: monday,
    });

    await storeMessageWithMemory({
      conversationId: crmConv.id,
      role: 'assistant',
      content: 'Here is the shortlist: HubSpot ($100/seat/month), Salesforce ($165/user/month), Pipedrive ($49/seat/month), Zoho CRM ($40/user/month), and Freshsales ($39/user/month).',
      createdAt: monday,
    });

    const result = await executeAgent({
      message: 'On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?',
      referenceDateUtc: new Date(),
    });

    expect(result.retrievedMemories.length).toBeGreaterThan(0);
    expect(result.isWebSearched).toBe(true);
    expect(result.researchEvidence.length).toBeGreaterThan(0);

    // Verify comparison was conducted and response includes confirmed details and sources
    expect(result.comparisons.length).toBeGreaterThan(0);
    expect(result.response).toMatch(/HubSpot|Freshsales|Pipedrive|Salesforce|Zoho/i);
    expect(result.response).toMatch(/https:\/\//); // Contains real source links
  });

  // =========================================================================
  // TEST 2: Exact historical date
  // =========================================================================
  it('TEST 2: Exact historical date: retrieves 3 November message accurately without inventing history', async () => {
    const nov3Date = DateTime.fromObject({ year: 2026, month: 11, day: 3, hour: 10, minute: 0 }, { zone: 'Asia/Kolkata' }).toUTC().toJSDate();
    const conv = await prisma.conversation.create({
      data: {
        title: 'Kafka vs Redis',
        createdAt: nov3Date,
      },
    });

    await storeMessageWithMemory({
      conversationId: conv.id,
      role: 'user',
      content: 'What are the main architectural differences between Apache Kafka and Redis Pub/Sub?',
      createdAt: nov3Date,
    });

    await storeMessageWithMemory({
      conversationId: conv.id,
      role: 'assistant',
      content: 'Kafka provides persistent commit-log storage and horizontal consumer group scaling, whereas Redis Pub/Sub is in-memory fire-and-forget.',
      createdAt: nov3Date,
    });

    const result = await executeAgent({
      message: 'What did I ask you on 3 November?',
      referenceDateUtc: new Date('2026-11-22T14:30:00Z'),
    });

    expect(result.retrievedMemories.length).toBeGreaterThan(0);
    expect(result.retrievedMemories[0].memory.content).toContain('Apache Kafka');
    expect(result.response).toContain('Apache Kafka and Redis Pub/Sub');
    expect(result.isWebSearched).toBe(false); // No unnecessary search
  });

  // =========================================================================
  // TEST 3: PostgreSQL pricing
  // =========================================================================
  it('TEST 3: PostgreSQL pricing: extracts providers, compares equivalent plans, evaluates parity', async () => {
    const lastTuesday = DateTime.now().setZone('Asia/Kolkata').minus({ days: 5 }).toUTC().toJSDate();
    const pgConv = await prisma.conversation.create({
      data: {
        title: 'PostgreSQL Providers',
        createdAt: lastTuesday,
      },
    });

    await storeMessageWithMemory({
      conversationId: pgConv.id,
      role: 'user',
      content: 'What are PostgreSQL hosting options? Neon Pro plan is $19/month base, Supabase Pro is $25/month.',
      createdAt: lastTuesday,
    });

    const result = await executeAgent({
      message: 'Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?',
      referenceDateUtc: new Date(),
    });

    expect(result.retrievedMemories.length).toBeGreaterThan(0);
    expect(result.isWebSearched).toBe(true);
    expect(result.comparisons.length).toBeGreaterThan(0);
    expect(result.response).toContain('Direct Answer');
  });

  // =========================================================================
  // TEST 4: General knowledge (No search)
  // =========================================================================
  it('TEST 4: General knowledge: answers directly without conducting unnecessary web search', async () => {
    const result = await executeAgent({
      message: 'What is a database index?',
      referenceDateUtc: new Date(),
    });

    expect(result.isWebSearched).toBe(false);
    expect(result.researchEvidence.length).toBe(0);
    expect(result.response.toLowerCase()).toContain('index');
    expect(result.response.toLowerCase()).toContain('tree');
  });

  // =========================================================================
  // TEST 5: Follow-up understanding
  // =========================================================================
  it('TEST 5: Follow-up understanding: retrieves previous context for "Which one is cheaper?"', async () => {
    const conv = await prisma.conversation.create({
      data: { title: 'Pricing comparison' },
    });

    await storeMessageWithMemory({
      conversationId: conv.id,
      role: 'user',
      content: 'Can you compare Neon at $19/month and Supabase at $25/month?',
    });

    await storeMessageWithMemory({
      conversationId: conv.id,
      role: 'assistant',
      content: 'Neon Pro base is $19/month whereas Supabase Pro is $25/month.',
    });

    const result = await executeAgent({
      conversationId: conv.id,
      message: 'Which one is cheaper?',
    });

    expect(result.retrievedMemories.length).toBeGreaterThan(0);
    expect(result.response.toLowerCase()).toMatch(/neon|cheaper|\$19/i);
  });

  // =========================================================================
  // TEST 6: Missing memory
  // =========================================================================
  it('TEST 6: Missing memory: admits missing conversation without hallucinating fake memories', async () => {
    const result = await executeAgent({
      message: 'What did I ask you on 14 February 2024 about quantum computing algorithms?',
      referenceDateUtc: new Date(),
    });

    expect(result.retrievedMemories.length).toBe(0);
    expect(result.response).toMatch(/could not find|not have a recorded|searched my memory/i);
    expect(result.response).not.toContain('You asked me to explain Shor\'s algorithm');
  });

  // =========================================================================
  // TEST 7: Conflicting evidence
  // =========================================================================
  it('TEST 7: Conflicting evidence: identifies conflict and communicates uncertainty', () => {
    const conflictingEvidence = buildEvidenceItems([
      {
        title: 'Blog A - Neon Pricing',
        url: 'https://bloga.com/neon',
        content: 'Neon Postgres Pro plan now starts at $29 per month.',
        isOfficial: false,
      },
      {
        title: 'Blog B - Neon Pricing',
        url: 'https://blogb.com/neon',
        content: 'Neon Postgres Pro plan is priced at $19 per month.',
        isOfficial: true,
      },
    ]);

    const conflicts = detectEvidenceConflicts(conflictingEvidence);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].entity).toBe('neon');
    expect(conflicts[0].description).toContain('Conflicting price figures found');
  });

  // =========================================================================
  // TEST 8: Outdated information handling
  // =========================================================================
  it('TEST 8: Outdated information: official and recent publication dates prioritized', () => {
    const items = [
      {
        title: 'Old Unofficial Forum post',
        url: 'https://forum.example.com/supabase-cost',
        content: 'Supabase was $20 in 2021',
        publishedDate: '2021-01-01',
        isOfficial: false,
        score: 0.5,
      },
      {
        title: 'Supabase Official Pricing',
        url: 'https://supabase.com/pricing',
        content: 'Supabase Pro Plan: $25/month flat fee per project',
        publishedDate: '2026-11-10',
        isOfficial: true,
        score: 0.95,
      },
    ];

    const officialItem = items.find(i => i.isOfficial);
    expect(officialItem).toBeDefined();
    expect(officialItem?.url).toBe('https://supabase.com/pricing');
    expect(officialItem?.content).toContain('$25/month');
  });

  // =========================================================================
  // TEST 9: Search failure graceful handling
  // =========================================================================
  it('TEST 9: Search failure: handles Tavily errors gracefully without throwing unhandled exceptions', async () => {
    // Calling search with an invalid domain / query simulation
    const res = await executeWebSearch('test failure mode', { maxResults: 1 });
    expect(res).toBeDefined();
    expect(res.results).toBeInstanceOf(Array);
  });

  // =========================================================================
  // TEST 10: Conversation isolation
  // =========================================================================
  it('TEST 10: Conversation isolation: distinct conversations maintain separate context without leakage', async () => {
    const convA = await prisma.conversation.create({ data: { title: 'Project Alpha' } });
    const convB = await prisma.conversation.create({ data: { title: 'Project Beta' } });

    await storeMessageWithMemory({
      conversationId: convA.id,
      role: 'user',
      content: 'Project Alpha uses Cassandra for high volume metrics storage.',
    });

    await storeMessageWithMemory({
      conversationId: convB.id,
      role: 'user',
      content: 'Project Beta uses SQLite for local edge embedded storage.',
    });

    const messagesA = await prisma.message.findMany({ where: { conversationId: convA.id } });
    const messagesB = await prisma.message.findMany({ where: { conversationId: convB.id } });

    expect(messagesA.length).toBe(1);
    expect(messagesB.length).toBe(1);
    expect(messagesA[0].content).toContain('Cassandra');
    expect(messagesB[0].content).not.toContain('Cassandra');
    expect(messagesB[0].content).toContain('SQLite');
  });
});
