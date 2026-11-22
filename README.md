# Minimi Conversational AI Research Agent

An autonomous, memory-aware research agent built for the Minimi hiring challenge. The agent remembers conversations across sessions, resolves relative and exact dates in `Asia/Kolkata` time, performs live external web research via Tavily, evaluates historical claims against current facts with strict parity rules, and presents verified, evidence-backed answers.

---

## Key Features

- **Cross-Session Memory & Storage**: Complete persistence of conversations, messages, memories, embeddings, research sessions, evidence, and comparisons using SQLite & Prisma ORM.
- **Hybrid Memory Retrieval Engine**: Combines cosine similarity over 1536-dimensional OpenAI embeddings (`text-embedding-3-small`), exact keyword/entity matching, temporal proximity decay, and conversation locality.
- **Deterministic Temporal Grounding**: Resolves exact dates ("3 November"), relative dates ("yesterday", "last week"), and weekdays ("last Tuesday", "on Monday") with timezone handling (`Asia/Kolkata` mapped to UTC boundaries).
- **Anti-Hallucination Integrity**: Strictly acknowledges missing historical conversations when not present in memory rather than fabricating past discussions.
- **Autonomous Web Research (Tavily Search)**: Searches official pricing, documentation, and changelogs with query deduplication, timeout guards, and strict iteration limits (max 5 searches, max 5 iterations).
- **Historical vs Current Comparison Engine**: Dedicated 7-step comparison engine with strict parity validation (checks matching product, plan, billing period, currency, and seat count) before classifying findings as `Changed`, `Unchanged`, `New information`, `Not comparable`, or `Unverified`.
- **Citations & Evidence**: Markdown citations linked directly to verified URLs; detects conflicting claims across sources.
- **Real-time Streaming Chat Interface**: React + Vite + Tailwind CSS UI with Server-Sent Events (SSE) streaming live execution traces, evidence cards, and interactive comparison tables.

---

## System Architecture

```text
USER MESSAGE
    │
    ▼
CHAT API (Express /api/chat)
    │
    ▼
AGENT ORCHESTRATOR
    │
    ├── 1. Intent Analysis & Date Grounding (Asia/Kolkata -> UTC)
    │
    ├── 2. Conversation Memory Retrieval (Cosine similarity + Keyword + Temporal)
    │
    ├── 3. Tool Decision Loop (Max 5 iterations)
    │        │
    │        ├── No Search (General knowledge / direct recall)
    │        │
    │        └── Web Search (Tavily API with deduplication & official tag)
    │
    ├── 4. Structured Evidence Analysis & Conflict Detection
    │
    ├── 5. Historical Comparison Engine (Strict parity rules)
    │
    ├── 6. Response Generator (Markdown tables & verified source links)
    │
    └── 7. Persistence (Prisma / SQLite)
             │
             ▼
      STREAMED USER RESPONSE (Server-Sent Events)
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended; verified on Node v24)
- **npm**: v9+ (verified on npm v11)

---

## Installation & Setup

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd minimi-agent
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your environment variables:

```ini
PORT=3001
NODE_ENV=development
APP_TIMEZONE=Asia/Kolkata
DATABASE_URL="file:./dev.db"

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Tavily Web Search Configuration
TAVILY_API_KEY=your_tavily_api_key_here

# Execution Bounds
MAX_AGENT_ITERATIONS=5
MAX_WEB_SEARCHES_PER_REQUEST=5
AGENT_REQUEST_TIMEOUT_MS=60000

# Mock Mode (Set to true to run offline deterministic tests without API keys)
MOCK_AI=false
```

*Note: If no API keys are provided or if `MOCK_AI=true`, the system automatically activates its built-in deterministic mock providers for embeddings and Tavily web research, allowing full offline development and automated testing.*

### 3. Database Initialization & Seeding

```bash
# Generate Prisma Client & Run Database Push
npm run prisma:generate
npm run prisma:migrate

# Seed realistic historical conversations (CRM shortlist, 3 Nov Kafka, Last Tuesday Postgres)
npm run prisma:seed
```

---

## Development

Run both backend server (port 3001) and frontend client (port 3000) concurrently:

```bash
npm run dev
```

- **Frontend Client**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **Health Endpoint**: `http://localhost:3001/api/health`

---

## Testing

Run the automated test suite powered by Vitest:

```bash
npm test
```

### Covered Test Scenarios (1 - 10 from Specification)

1. **TEST 1: Historical CRM Research**: Retrieves 5 shortlisted CRM tools for a 20-person sales team from Monday, extracts entities, searches current pricing/changelogs, evaluates comparison, and returns evidence-backed citations.
2. **TEST 2: Exact Historical Date**: Resolves "3 November" in `Asia/Kolkata`, retrieves historical conversation, and returns exact historical text without inventing facts.
3. **TEST 3: PostgreSQL Pricing**: Identifies historical hosting providers, searches current pricing, evaluates parity across equivalent plans, and confirms actual changes.
4. **TEST 4: General Knowledge**: Answers direct technical questions ("What is a database index?") without conducting unnecessary web searches.
5. **TEST 5: Follow-up Understanding**: Resolves contextual follow-up ("Which one is cheaper?") using conversation history.
6. **TEST 6: Missing Memory**: Explicitly communicates when a requested historical conversation is not found; avoids fabrication.
7. **TEST 7: Conflicting Evidence**: Detects divergent claims across search snippets and alerts the user of the conflict.
8. **TEST 8: Outdated Information**: Prioritizes recent, official primary documentation over dated third-party forum posts.
9. **TEST 9: Search Failure**: Gracefully handles API network timeouts or search errors without application crashes.
10. **TEST 10: Conversation Isolation**: Guarantees distinct conversations maintain isolated contexts without memory contamination.

---

## Production Build

```bash
npm run build
```

---

## License

MIT
