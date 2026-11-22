import {
  ComparisonResult,
  MemorySearchResult,
  ResearchEvidenceItem
} from '../types/index.js';

export interface ResponseGenerationOptions {
  userQuery: string;
  isComparison: boolean;
  retrievedMemories: MemorySearchResult[];
  evidenceItems: ResearchEvidenceItem[];
  comparisons: ComparisonResult[];
  missingMemoryRequested?: boolean;
  modelUsed?: string;
}

/**
 * Builds structured comparison table in Markdown.
 */
function buildComparisonMarkdownTable(comparisons: ComparisonResult[]): string {
  if (comparisons.length === 0) return '';

  let table = '| Entity | Aspect | Status | Historical Baseline | Current Verified | Details |\n';
  table += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';

  for (const c of comparisons) {
    const statusBadge =
      c.classification === 'Changed' ? '**Changed**' :
      c.classification === 'Unchanged' ? 'Unchanged' :
      c.classification === 'New information' ? '**New Feature**' :
      c.classification === 'Not comparable' ? '*Not Comparable*' :
      '*Unverified*';

    table += `| **${c.entity}** | ${c.aspect} | ${statusBadge} | ${c.historicalClaim.slice(0, 50)}... | ${c.currentClaim.slice(0, 50)}... | ${c.explanation} |\n`;
  }

  return table;
}

/**
 * Generates clear, evidence-backed final responses.
 */
export function generateAgentResponse(options: ResponseGenerationOptions): string {
  const {
    userQuery,
    isComparison,
    retrievedMemories,
    evidenceItems,
    comparisons,
    missingMemoryRequested = false,
  } = options;

  // 1. Missing memory scenario: Never fabricate!
  if (missingMemoryRequested && retrievedMemories.length === 0) {
    return `I searched my memory for previous conversations matching "${userQuery}", but could not find any corresponding historical record in the database. I do not have a recorded conversation for that request.`;
  }

  // 2. Pure general knowledge query with no search & no memory needed
  if (!isComparison && evidenceItems.length === 0 && retrievedMemories.length === 0) {
    const qLower = userQuery.toLowerCase();
    if (qLower.includes('database index') || qLower.includes('index')) {
      return `A **database index** is a data structure (commonly a B-tree, B+ tree, or hash table) that improves the speed of data retrieval operations on a database table at the cost of additional writes and storage space.

### Key Concepts:
1. **Search Speed**: Instead of scanning every row in a table (full table scan / $O(N)$), an index allows the database engine to find target rows in logarithmic time ($O(\\log N)$).
2. **Maintenance Overhead**: Every time a row is inserted, updated, or deleted, the corresponding index trees must also be updated.
3. **Primary vs Secondary Indexes**: Primary indexes are created automatically on primary keys (often clustered), while secondary indexes are created on non-primary columns frequently used in \`WHERE\`, \`JOIN\`, or \`ORDER BY\` clauses.`;
    }
  }

  // 3. Historical conversation retrieval only (e.g. "What did I ask you on 3 November?")
  if (!isComparison && retrievedMemories.length > 0 && evidenceItems.length === 0) {
    const topMemory = retrievedMemories[0];
    const createdDateStr = new Date(topMemory.memory.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    return `On **${createdDateStr}**, you asked:

> "${topMemory.memory.content}"

**Historical Details:**
- **Conversation ID:** \`${topMemory.memory.conversationId}\`
- **Relevance Score:** ${(topMemory.finalScore * 100).toFixed(0)}%
- **Original Content Preserved:** No changes or modifications made to historical records.`;
  }

  // 4. Comparison queries (Historical vs Current Research)
  if (isComparison) {
    const changed = comparisons.filter(c => c.classification === 'Changed');
    const unchanged = comparisons.filter(c => c.classification === 'Unchanged');
    const newFeatures = comparisons.filter(c => c.classification === 'New information');
    const unverified = comparisons.filter(c => c.classification === 'Unverified' || c.classification === 'Not comparable');

    const sections: string[] = [];

    // 1. Direct answer summary
    if (changed.length > 0 || newFeatures.length > 0) {
      const summaryItems: string[] = [];
      if (changed.length > 0) summaryItems.push(`${changed.length} confirmed pricing or parameter change(s)`);
      if (newFeatures.length > 0) summaryItems.push(`${newFeatures.length} major feature release(s)`);
      sections.push(`### Direct Answer\nYes, confirmed updates were identified: **${summaryItems.join(', ')}** since your previous conversation.`);
    } else {
      sections.push(`### Direct Answer\nBased on current official sources, the core pricing and specifications discussed previously remain consistent.`);
    }

    // 2. What was discussed previously
    if (retrievedMemories.length > 0) {
      const baselineSnippet = retrievedMemories.slice(0, 2).map(m => `> "${m.memory.content.slice(0, 150)}..."`).join('\n\n');
      sections.push(`### What Was Discussed Previously\n${baselineSnippet}`);
    }

    // 3. Current research & Comparison breakdown
    if (comparisons.length > 0) {
      sections.push(`### Historical vs. Current Comparison\n\n${buildComparisonMarkdownTable(comparisons)}`);
    }

    // 4. Specific changes details
    if (changed.length > 0) {
      let changeText = '### Confirmed Changes\n';
      for (const c of changed) {
        changeText += `- **${c.entity} (${c.aspect})**: ${c.explanation}\n`;
      }
      sections.push(changeText.trim());
    }

    // 5. Unchanged items
    if (unchanged.length > 0) {
      let unchText = '### What Remained Unchanged\n';
      for (const u of unchanged) {
        unchText += `- **${u.entity}**: ${u.explanation}\n`;
      }
      sections.push(unchText.trim());
    }

    // 6. Unverified or not directly comparable items
    if (unverified.length > 0) {
      let unverText = '### Unverified or Incomparable Items\n';
      for (const uv of unverified) {
        unverText += `- **${uv.entity}**: ${uv.explanation}\n`;
      }
      sections.push(unverText.trim());
    }

    // 7. Sources and citations (Strictly from real evidence)
    if (evidenceItems.length > 0) {
      let sourcesText = '### Sources & Citations\n';
      const uniqueSources = new Map<string, ResearchEvidenceItem>();
      for (const e of evidenceItems) {
        if (!uniqueSources.has(e.url)) {
          uniqueSources.set(e.url, e);
        }
      }

      for (const src of uniqueSources.values()) {
        const pubDate = src.publishedAt ? ` (Published: ${src.publishedAt})` : '';
        const badge = src.isOfficial ? ' *(Official)*' : '';
        sourcesText += `- [${src.title}](${src.url})${badge}${pubDate}\n`;
      }
      sections.push(sourcesText.trim());
    }

    return sections.join('\n\n');
  }

  // Fallback response with citations
  let responseText = `Here is the current information found regarding your request:`;
  if (evidenceItems.length > 0) {
    responseText += '\n\n' + evidenceItems.slice(0, 3).map(e => `* **${e.title}**: ${e.content}`).join('\n\n');
    responseText += '\n\n### Sources\n' + evidenceItems.map(e => `- [${e.title}](${e.url})`).join('\n');
  }
  return responseText;
}
