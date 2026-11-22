import { prisma } from '../src/database/prisma.js';
import { storeMessageWithMemory } from '../src/memory/storage.js';
import { DateTime } from 'luxon';

async function seed() {
  console.log('[Seed] Seeding sample historical conversations...');

  // Clear existing data for clean seed
  await prisma.comparison.deleteMany();
  await prisma.researchEvidence.deleteMany();
  await prisma.researchSession.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();

  const nowKolkata = DateTime.now().setZone('Asia/Kolkata');

  // =========================================================================
  // SCENARIO 1: CRM Shortlist for 20-person sales team on Monday
  // =========================================================================
  const monday = nowKolkata.minus({ days: (nowKolkata.weekday - 1 + 7) % 7 || 7 }).set({ hour: 11, minute: 30 });
  const crmConv = await prisma.conversation.create({
    data: {
      title: 'CRM Shortlist for 20-person sales team',
      createdAt: monday.toUTC().toJSDate(),
      updatedAt: monday.toUTC().toJSDate(),
    },
  });

  await storeMessageWithMemory({
    conversationId: crmConv.id,
    role: 'user',
    content: 'Can you shortlist 5 CRM tools for our 20-person sales team with pricing and key features?',
    createdAt: monday.toUTC().toJSDate(),
  });

  await storeMessageWithMemory({
    conversationId: crmConv.id,
    role: 'assistant',
    content: `Here is the shortlist of 5 CRM tools evaluated for your 20-person sales team:

1. **HubSpot CRM (Sales Hub Pro)**:
   - Pricing: $100/seat/month billed annually ($2,000/month total for 20 seats).
   - Features: Advanced pipeline automation, sequences, custom reporting.

2. **Salesforce (Sales Cloud Enterprise)**:
   - Pricing: $165/user/month ($3,300/month total for 20 users).
   - Features: Enterprise workflow rules, territory management, advanced integrations.

3. **Pipedrive (Professional Plan)**:
   - Pricing: $49/seat/month billed annually ($980/month total for 20 seats).
   - Features: Visual sales pipelines, deal rotting indicators, team goals.

4. **Zoho CRM (Enterprise)**:
   - Pricing: $40/user/month billed annually ($800/month total for 20 users).
   - Features: Zia AI assistant, multi-page layouts, blueprint automation.

5. **Freshsales (Pro Plan)**:
   - Pricing: $39/user/month billed annually ($780/month total for 20 users).
   - Features: AI-based deal insights, automated workflows, SMS integration.`,
    createdAt: monday.plus({ minutes: 2 }).toUTC().toJSDate(),
  });

  // =========================================================================
  // SCENARIO 2: Conversation on 3 November
  // =========================================================================
  const nov3 = DateTime.fromObject({ year: 2026, month: 11, day: 3, hour: 14, minute: 15 }, { zone: 'Asia/Kolkata' });
  const nov3Conv = await prisma.conversation.create({
    data: {
      title: 'Distributed Event Streaming Architecture',
      createdAt: nov3.toUTC().toJSDate(),
      updatedAt: nov3.toUTC().toJSDate(),
    },
  });

  await storeMessageWithMemory({
    conversationId: nov3Conv.id,
    role: 'user',
    content: 'What are the main architectural differences between Apache Kafka and Redis Pub/Sub for high-throughput event streaming?',
    createdAt: nov3.toUTC().toJSDate(),
  });

  await storeMessageWithMemory({
    conversationId: nov3Conv.id,
    role: 'assistant',
    content: `The primary differences between Apache Kafka and Redis Pub/Sub are:
1. **Persistence & Log Replay**: Kafka retains published messages on disk in partitioned, immutable commit logs, allowing consumers to rewind and re-read historical streams. Redis Pub/Sub is fire-and-forget; disconnected subscribers lose in-flight messages (unless using Redis Streams).
2. **Consumer Scaling**: Kafka scales consumer groups horizontally across partition boundaries.
3. **Throughput vs Latency**: Redis delivers sub-millisecond memory-first latency; Kafka is optimized for massive batched sequential I/O and partitioned parallel throughput.`,
    createdAt: nov3.plus({ minutes: 3 }).toUTC().toJSDate(),
  });

  // =========================================================================
  // SCENARIO 3: PostgreSQL Hosting conversation last Tuesday
  // =========================================================================
  const lastTuesday = nowKolkata.minus({ days: (nowKolkata.weekday - 2 + 7) % 7 || 7 }).set({ hour: 16, minute: 0 });
  const postgresConv = await prisma.conversation.create({
    data: {
      title: 'PostgreSQL Hosting Providers Comparison',
      createdAt: lastTuesday.toUTC().toJSDate(),
      updatedAt: lastTuesday.toUTC().toJSDate(),
    },
  });

  await storeMessageWithMemory({
    conversationId: postgresConv.id,
    role: 'user',
    content: 'I need managed PostgreSQL hosting for our production app. What are the best options and their pricing?',
    createdAt: lastTuesday.toUTC().toJSDate(),
  });

  await storeMessageWithMemory({
    conversationId: postgresConv.id,
    role: 'assistant',
    content: `Here are the top managed PostgreSQL hosting providers evaluated:

1. **Neon Serverless Postgres**:
   - Pricing: Pro plan starts at $19/month base (includes 10 GiB storage, 750 compute hours). Additional compute at $0.16/CU-hour.
   - Highlights: Instant branch database copies, autoscaling down to zero.

2. **Supabase**:
   - Pricing: Pro Plan at $25/month flat fee per project (8 GB disk, 250k monthly active users).
   - Highlights: Built-in Auth, Storage, Edge Functions, Row Level Security.

3. **Render Managed PostgreSQL**:
   - Pricing: Starter at $7/month (1 GB RAM, 10 GB SSD). Standard plan is $35/month (4 GB RAM, 50 GB SSD).
   - Highlights: Zero-maintenance fully managed instances with automatic backups.

4. **Railway PostgreSQL**:
   - Pricing: Pro plan at $20/month base plus usage-based compute ($0.000231/vCPU/minute).
   - Highlights: Ephemeral preview environments, rapid container-like deployments.`,
    createdAt: lastTuesday.plus({ minutes: 2 }).toUTC().toJSDate(),
  });

  console.log('[Seed] Database successfully seeded with 3 realistic historical conversations!');
}

seed()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
