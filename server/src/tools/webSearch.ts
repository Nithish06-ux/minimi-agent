import { WebSearchResponse, WebSearchResultItem } from '../types/index.js';
import { config } from '../config.js';

// Realistic mock search dataset for testing scenarios and offline operation
const MOCK_KNOWLEDGE_BASE: Record<string, WebSearchResultItem[]> = {
  crm: [
    {
      title: 'HubSpot CRM Official Pricing 2026',
      url: 'https://www.hubspot.com/pricing/sales',
      content: 'HubSpot Sales Hub Pro for 20 seats: $100/seat/month billed annually ($2,000/month total). Includes advanced CRM, predictive lead scoring, sequences, and custom reporting.',
      publishedDate: '2026-11-15',
      score: 0.95,
      isOfficial: true,
    },
    {
      title: 'Salesforce Sales Cloud Pricing & Editions',
      url: 'https://www.salesforce.com/editions-pricing/sales-cloud',
      content: 'Salesforce Enterprise edition is $165/user/month. Required for teams needing workflow automation, advanced pipeline inspection, and API integrations.',
      publishedDate: '2026-11-10',
      score: 0.92,
      isOfficial: true,
    },
    {
      title: 'Pipedrive Pricing Plans - Simple Sales CRM',
      url: 'https://www.pipedrive.com/en/pricing',
      content: 'Pipedrive Professional plan is $49/seat/month billed annually. Feature update: Shipped AI Sales Assistant 2.0 with automated email summaries in November 2026.',
      publishedDate: '2026-11-18',
      score: 0.91,
      isOfficial: true,
    },
    {
      title: 'Zoho CRM Pricing - Best Value CRM',
      url: 'https://www.zoho.com/crm/zohocrm-pricing.html',
      content: 'Zoho CRM Enterprise plan remains $40/user/month billed annually ($50/month billed monthly). Zia AI predictive analytics included.',
      publishedDate: '2026-11-01',
      score: 0.88,
      isOfficial: true,
    },
    {
      title: 'Freshsales Pricing - Modern Sales CRM',
      url: 'https://www.freshworks.com/crm/sales/pricing',
      content: 'Freshsales Pro plan increased pricing from $39 to $47/user/month billed annually starting Q4 2026. Shipped Freddy AI generative deal insights.',
      publishedDate: '2026-11-12',
      score: 0.87,
      isOfficial: true,
    },
  ],
  postgres: [
    {
      title: 'Neon Serverless Postgres Pricing',
      url: 'https://neon.tech/pricing',
      content: 'Neon Pro plan updated: $19/month base includes 10 GiB storage, 750 compute hours. Additional compute at $0.16/CU-hour. Shipped Autoscaling branch previews in late 2026.',
      publishedDate: '2026-11-14',
      score: 0.96,
      isOfficial: true,
    },
    {
      title: 'Supabase Database & Platform Pricing',
      url: 'https://supabase.com/pricing',
      content: 'Supabase Pro Plan: $25/month flat fee per project including 8 GB disk, 250k monthly active users, 100k daily edge function invocations. Compute add-ons available.',
      publishedDate: '2026-11-10',
      score: 0.94,
      isOfficial: true,
    },
    {
      title: 'Render PostgreSQL Hosting Plans & Pricing',
      url: 'https://render.com/pricing#databases',
      content: 'Render Managed PostgreSQL: Starter at $7/month (1 GB RAM, 0.5 CPU, 10 GB SSD). Standard plan remains $35/month (4 GB RAM, 2 CPU, 50 GB SSD).',
      publishedDate: '2026-11-05',
      score: 0.90,
      isOfficial: true,
    },
    {
      title: 'Railway PostgreSQL Database Pricing',
      url: 'https://railway.app/pricing',
      content: 'Railway Pro plan: $20/month base + usage-based compute ($0.000231/vCPU/minute, $0.0000463/GB RAM/minute). High availability Postgres clustering announced.',
      publishedDate: '2026-11-12',
      score: 0.89,
      isOfficial: true,
    },
  ],
};

/**
 * Checks whether a URL points to an official domain or official page.
 */
export function isOfficialSource(url: string, query: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Check if official indicators in path
    if (pathname.includes('/pricing') || pathname.includes('/docs') || pathname.includes('/changelog') || pathname.includes('/blog')) {
      return true;
    }

    // Check query tokens in host
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    for (const token of tokens) {
      if (host.includes(token)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Deduplicates search results by URL.
 */
export function deduplicateResults(items: WebSearchResultItem[]): WebSearchResultItem[] {
  const seenUrls = new Set<string>();
  const result: WebSearchResultItem[] = [];

  for (const item of items) {
    // Normalize URL: remove trailing slash and tracking query params
    let cleanUrl = item.url;
    try {
      const u = new URL(item.url);
      cleanUrl = `${u.origin}${u.pathname.replace(/\/$/, '')}`;
    } catch {
      // keep raw url
    }

    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      result.push(item);
    }
  }

  return result;
}

/**
 * Executes a web search using Tavily API.
 * Falls back to mock search provider if TAVILY_API_KEY is not set or in mock mode.
 */
export async function executeWebSearch(
  query: string,
  options: { maxResults?: number; searchDepth?: 'basic' | 'advanced' } = {}
): Promise<WebSearchResponse> {
  const { maxResults = 5, searchDepth = 'advanced' } = options;
  const retrievedAt = new Date();

  // If no Tavily key or MOCK_AI is enabled, provide mock search results
  if (!config.TAVILY_API_KEY || config.MOCK_AI) {
    const qLower = query.toLowerCase();
    let matches: WebSearchResultItem[] = [];

    if (qLower.includes('crm') || qLower.includes('salesforce') || qLower.includes('hubspot') || qLower.includes('pipedrive')) {
      matches = MOCK_KNOWLEDGE_BASE['crm'];
    } else if (qLower.includes('postgres') || qLower.includes('neon') || qLower.includes('supabase') || qLower.includes('render')) {
      matches = MOCK_KNOWLEDGE_BASE['postgres'];
    } else {
      matches = [
        {
          title: `Official Documentation: ${query}`,
          url: `https://docs.example.com/search?q=${encodeURIComponent(query)}`,
          content: `Current verified documentation regarding ${query}. No breaking pricing changes or service deprecations detected in recent releases.`,
          publishedDate: new Date().toISOString().split('T')[0],
          score: 0.85,
          isOfficial: true,
        },
      ];
    }

    return {
      query,
      results: deduplicateResults(matches.slice(0, maxResults)),
      retrievedAt,
    };
  }

  // Real Tavily API call
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.TAVILY_API_KEY,
        query,
        search_depth: searchDepth,
        include_answer: false,
        include_raw_content: false,
        max_results: maxResults,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WebSearch] Tavily API error (${response.status}):`, errorText);
      return {
        query,
        results: [],
        retrievedAt,
        error: `Tavily API responded with status ${response.status}`,
      };
    }

    const data = await response.json() as {
      results?: Array<{
        title: string;
        url: string;
        content: string;
        published_date?: string;
        score?: number;
      }>;
    };

    const items: WebSearchResultItem[] = (data.results || []).map((item) => ({
      title: item.title,
      url: item.url,
      content: item.content,
      publishedDate: item.published_date || null,
      score: item.score || 0.8,
      isOfficial: isOfficialSource(item.url, query),
    }));

    return {
      query,
      results: deduplicateResults(items),
      retrievedAt,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error).name === 'AbortError';
    console.error(`[WebSearch] Search failed:`, (err as Error).message);
    return {
      query,
      results: [],
      retrievedAt,
      error: isTimeout ? 'Web search timed out after 12s' : (err as Error).message,
    };
  }
}
