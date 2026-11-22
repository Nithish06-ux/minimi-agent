import { ResearchEvidenceItem, WebSearchResultItem } from '../types/index.js';

export interface EvidenceConflict {
  entity: string;
  field: string;
  sources: Array<{ url: string; claim: string; date?: string | null }>;
  description: string;
}

/**
 * Transforms raw search results into structured evidence items with metadata.
 */
export function buildEvidenceItems(
  searchResults: WebSearchResultItem[],
  associatedClaim?: string
): ResearchEvidenceItem[] {
  return searchResults.map(item => ({
    title: item.title,
    url: item.url,
    content: item.content,
    publishedAt: item.publishedDate || null,
    retrievedAt: new Date(),
    associatedClaim: associatedClaim || null,
    isOfficial: item.isOfficial || false,
  }));
}

/**
 * Detects conflicts between retrieved evidence items (e.g. differing prices or contradictory statements).
 */
export function detectEvidenceConflicts(evidenceList: ResearchEvidenceItem[]): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];
  const entityPriceMap = new Map<string, Array<{ price: number; url: string; content: string; date?: string | null; isOfficial: boolean }>>();

  for (const item of evidenceList) {
    const priceMatches = Array.from(item.content.matchAll(/\$(\d+(?:\.\d{2})?)/g));
    if (priceMatches.length > 0) {
      // Find possible entity
      const entities = ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'freshsales', 'neon', 'supabase', 'render', 'railway'];
      for (const ent of entities) {
        if (item.content.toLowerCase().includes(ent) || item.title.toLowerCase().includes(ent)) {
          const existing = entityPriceMap.get(ent) || [];
          for (const m of priceMatches) {
            existing.push({
              price: parseFloat(m[1]),
              url: item.url,
              content: item.content,
              date: item.publishedAt,
              isOfficial: item.isOfficial,
            });
          }
          entityPriceMap.set(ent, existing);
        }
      }
    }
  }

  for (const [entity, records] of entityPriceMap.entries()) {
    if (records.length > 1) {
      const distinctPrices = Array.from(new Set(records.map(r => r.price)));
      if (distinctPrices.length > 1) {
        // If one is official and more recent, it's preferred, but flag conflict if sources disagree
        conflicts.push({
          entity,
          field: 'price',
          sources: records.map(r => ({ url: r.url, claim: `$${r.price} found in snippet: "${r.content.slice(0, 100)}..."`, date: r.date })),
          description: `Conflicting price figures found for ${entity}: ${distinctPrices.map(p => `$${p}`).join(' vs ')}. Review source dates and plan tiers.`,
        });
      }
    }
  }

  return conflicts;
}
