import { executeWebSearch } from '../tools/webSearch.js';
import { WebSearchResponse } from '../types/index.js';
import { config } from '../config.js';

export class ToolExecutor {
  private searchCount = 0;
  private executedQueries = new Set<string>();

  /**
   * Executes a web search tool call with safety guardrails:
   * - Max 5 web searches per request
   * - Deduplicates identical queries
   * - Request timeout handling
   */
  async runWebSearch(query: string): Promise<WebSearchResponse | null> {
    const normalizedQuery = query.toLowerCase().trim();

    if (this.searchCount >= config.MAX_WEB_SEARCHES_PER_REQUEST) {
      console.warn(`[ToolExecutor] Max searches reached (${config.MAX_WEB_SEARCHES_PER_REQUEST}). Skipping query: ${query}`);
      return null;
    }

    if (this.executedQueries.has(normalizedQuery)) {
      console.log(`[ToolExecutor] Skipping duplicate search query: ${query}`);
      return null;
    }

    this.searchCount++;
    this.executedQueries.add(normalizedQuery);

    console.log(`[ToolExecutor] Executing web search [${this.searchCount}/${config.MAX_WEB_SEARCHES_PER_REQUEST}]: "${query}"`);
    return await executeWebSearch(query, { maxResults: 5 });
  }

  getExecutionCount(): number {
    return this.searchCount;
  }
}
