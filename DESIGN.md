# DESIGN DOCUMENT: MINIMI CONVERSATIONAL AI RESEARCH AGENT

## 1. How the System Works

Minimi Agent is an autonomous conversational research agent designed to bridge the gap between longitudinal conversation memory and live external web fact-checking. 

When a user submits a query:
1. **Intent Analysis & Temporal Grounding**: The query is analyzed to determine if it refers to past discussions (e.g., shortlists, dates like "3 November", relative phrases like "last Tuesday") or demands fresh external facts (pricing changes, new feature shipments). Ambiguous temporal expressions are deterministically grounded using `luxon` in the `Asia/Kolkata` timezone and transformed into UTC timestamp boundaries.
2. **Hybrid Memory Retrieval**: The agent retrieves relevant historical context using an ensemble scoring system: cosine similarity over 1536-dimensional embeddings (`text-embedding-3-small`), exact keyword/entity matching, temporal proximity decay, and conversation locality.
3. **Controlled Tool Loop & Web Search**: If current information is needed, the agent invokes its sole external tool—**Tavily Search**—under strict loop bounds (max 5 iterations, max 5 searches).
4. **Structured Evidence & Parity Comparison**: Web snippets are ingested into structured `ResearchEvidence` objects. If the user asks whether details have changed, a dedicated 7-step comparison engine validates parity (same product, same plan tier, same billing cycle, same seat count) before classifying findings as `Changed`, `Unchanged`, `New information`, `Not comparable`, or `Unverified`.
5. **Streaming Synthesis & Citations**: The final response is generated with verifiable source citations and comparison matrices, streamed in real time to the React UI via Server-Sent Events (SSE).

---

## 2. Why This Architecture Was Selected

A modular, layered pipeline was chosen over an unconstrained "ReAct" prompt or monolithic route handler for five concrete engineering reasons:
- **Determinism & Cost Control**: An unconstrained LLM loop frequently burns API quota executing duplicate searches or looping on vague intents. Decoupling intent analysis and query synthesis keeps tool calls capped at 5 and predictable.
- **Strict Parity Checks in Code**: Large language models easily commit comparison errors (e.g. comparing an annual contract price of \$40/mo with a monthly rolling price of \$50/mo and hallucinating a \$10 price hike). Enforcing billing, currency, and tier normalization in TypeScript guarantees factual accuracy.
- **Separation of Concerns**: Memory ingestion, similarity ranking, external web retrieval, and LLM synthesis live in independent, unit-testable modules.
- **Portability**: The SQLite + Prisma foundation requires zero external Docker daemon or vector database cluster for local evaluation.

---

## 3. How Memory Retrieval Works

The memory system addresses the reality that SQLite does not feature native vector types without bespoke compiled extensions.
1. **Ingestion & Metadata Extraction**: As each message arrives, it is stored in SQLite alongside its extracted entities, topics, and question flags. The text is passed through `text-embedding-3-small` (or a deterministic mock vector generator when offline). The resulting 1536-dimensional unit float array is serialized as JSON in `Memory.embedding`.
2. **Database Pre-filtering**: Queries with resolved exact dates (e.g. "3 November") apply indexed UTC SQL range filters (`createdAt BETWEEN startUtc AND endUtc`) to prune candidates at the database tier.
3. **Hybrid In-Memory Ranking**: For candidate records, the engine calculates:
   $$\text{FinalScore} = w_{\text{sem}} \cdot S_{\text{sem}} + w_{\text{key}} \cdot S_{\text{key}} + w_{\text{temp}} \cdot S_{\text{temp}} + w_{\text{conv}} \cdot S_{\text{conv}}$$
   - **$S_{\text{sem}}$**: Dot product cosine similarity $\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$.
   - **$S_{\text{key}}$**: Multi-token and entity match density with boost for known products.
   - **$S_{\text{temp}}$**: Gaussian-like temporal decay or binary window match for explicit dates.
   - **$S_{\text{conv}}$**: Active conversation proximity bonus.
4. **Anti-Hallucination Guardrail**: If an exact historical date or topic is requested and the candidate pool yields zero matches above threshold (0.20), the engine flags `missingMemoryRequested = true`. The agent explicitly admits the absence of records rather than generating plausible fiction.

---

## 4. How the Agent Decides to Search

The agent uses a two-stage filter to prevent unnecessary, wasteful web queries:
1. **General Knowledge Filter**: Standard conceptual questions ("What is a database index?", "Explain ACID transactions") match regex heuristics and are answered directly from model knowledge without touching search APIs.
2. **Temporal & Factuality Detection**: Queries containing action verbs ("has any changed", "shipped something big", "still correct today", "current pricing") activate search query generation.
3. **Targeted Entity Queries**: When a comparison is requested over an existing shortlist (e.g. 5 CRM tools), search queries are programmatically constructed per entity (e.g. `"HubSpot Sales Hub pricing official"`, `"Pipedrive changelog 2026"`) rather than issuing one generic sentence query to Tavily.

---

## 5. How Historical/Current Comparisons Work

Comparison operates across seven distinct steps:
1. **Historical Baseline Extraction**: Parse historical messages for claims, prices, tiers, and seat limits.
2. **Current Finding Extraction**: Parse Tavily search snippets for current claims, prices, tiers, and dates.
3. **Entity Alignment**: Match records by canonical product name (e.g. `HubSpot`, `Neon`, `Supabase`).
4. **Parity Verification**: Verify equivalent conditions:
   - Same product and sub-brand.
   - Same subscription plan (e.g. `Pro` vs `Pro`, not `Pro` vs `Enterprise`).
   - Same billing frequency (`annual` vs `monthly`).
   - Same unit / seat count (e.g. 20-person sales team).
   - Same currency.
5. **Classification**:
   - `Changed`: Confirmed numeric or functional change on identical plan.
   - `Unchanged`: Current official sources confirm baseline figures.
   - `New information`: Newly shipped features, announcements, or AI capabilities.
   - `Not comparable`: Conditions differ (e.g., annual vs monthly).
   - `Unverified`: Insufficient primary evidence to confirm current status.
6. **Explanation Synthesis**: Clear description of what changed and what remained stable.

---

## 6. How Evidence and Citations Are Handled

- **Primary Source Prioritization**: Official domains (`/pricing`, `/docs`, `/changelog`, root vendor domains) receive an `isOfficial` tag and higher trust weight.
- **URL Deduplication**: Normalized origin and path deduplication prevents spamming multiple snippets from identical pages.
- **Conflict Detection**: When multiple sources report differing numeric pricing, the system flags a conflict warning and alerts the user to verify billing terms.
- **Strict Citation Formatting**: Every researched claim references explicit markdown links `[Title](url)` taken directly from returned Tavily results. The LLM is prohibited from synthesizing URLs from memory.

---

## 7. Alternatives Considered and Rejected

1. **pgvector / External Vector Database (Pinecone/Milvus/Qdrant)**:
   - *Rejected*: Adds complex external daemon dependencies or requires Docker for local evaluation. Storing normalized embeddings in SQLite with in-memory dot product takes < 5ms for hundreds of conversation records and runs everywhere seamlessly.
2. **Unconstrained Autonomous ReAct Loop**:
   - *Rejected*: Prone to infinite tool loops, high latency, nondeterministic search queries, and prompt injection from untrusted web pages. A structured multi-step orchestrator guarantees deterministic execution.
3. **Client-Side API Calls**:
   - *Rejected*: Exposes `OPENAI_API_KEY` and `TAVILY_API_KEY` to the browser. All AI and tool calls are strictly backend-isolated.

---

## 8. Known Limitations

- **Embedding Granularity**: Messages are embedded at the full message level. Extremely long multi-topic turns (>2000 words) could benefit from recursive sentence-chunking.
- **Paywalled & JavaScript-Rendered Content**: Tavily returns snippet summaries, but pricing calculators behind complex interactive JS forms may require browser rendering tools if snippets omit specific volume discounts.
- **Language**: Current regex entity patterns are optimized for English pricing constructs (`$X/mo`, `annual`, `per user`).

---

## 9. What I Would Improve With Another Week

1. **Hybrid Vector SQLite Virtual Table**: Compile `sqlite-vss` or implement an HNSW index extension for sub-millisecond similarity over 100,000+ messages.
2. **Dynamic Web Scraping Fallback**: Integrate Playwright headless browser automation directly as a secondary deep-fetch tool when snippet confidence is below 0.6.
3. **Multi-Currency Normalization**: Integrate live ECB exchange rate lookup to compare pricing across currencies ($ to € to ₹).
4. **Multi-Agent Debate**: Run a dedicated "Devil's Advocate" agent verification pass that checks extracted claims against source snippets to eliminate any subtle hallucinated numbers.
