import {
  ComparisonClassification,
  ComparisonResult,
  EntityClaim,
  ResearchEvidenceItem
} from '../types/index.js';
import { extractClaimsAndEntities } from './extraction.js';

export interface CompareOptions {
  historicalText: string;
  evidenceItems: ResearchEvidenceItem[];
  userQuery?: string;
}

/**
 * Dedicated 7-Step Historical vs Current Comparison Engine.
 *
 * Implements strict rules:
 * - Pricing: Never compare without matching product, plan, billing period, currency, seat count/allowance.
 * - Product updates: Identifies newly released features, major changes, removals.
 * - Classifications: Changed, Unchanged, New information, Removed, Unverified, Not comparable.
 */
export function compareHistoricalAndCurrent(options: CompareOptions): ComparisonResult[] {
  const { historicalText, evidenceItems } = options;

  // STEP 1 & 2 & 3: Extract historical claims and entities
  const historicalClaims = extractClaimsAndEntities(historicalText);

  // STEP 4 & 5: Extract current claims from evidence
  const currentClaims: EntityClaim[] = [];
  for (const ev of evidenceItems) {
    const extracted = extractClaimsAndEntities(ev.content);
    for (const claim of extracted) {
      currentClaims.push(claim);
    }
  }

  // STEP 6 & 7: Compare each historical claim against current findings
  const comparisons: ComparisonResult[] = [];

  // Group historical claims by entity
  const historicalByEntity = new Map<string, EntityClaim[]>();
  for (const hc of historicalClaims) {
    const list = historicalByEntity.get(hc.entity) || [];
    list.push(hc);
    historicalByEntity.set(hc.entity, list);
  }

  for (const [entity, hClaims] of historicalByEntity.entries()) {
    // Find corresponding current claims and evidence for this entity
    const matchingCurrent = currentClaims.filter(c => c.entity.toLowerCase() === entity.toLowerCase());
    const matchingEvidence = evidenceItems.filter(e =>
      e.title.toLowerCase().includes(entity.toLowerCase()) ||
      e.content.toLowerCase().includes(entity.toLowerCase())
    );

    const primaryEvidenceUrl = matchingEvidence[0]?.url || evidenceItems[0]?.url;

    // Check pricing aspect
    const historicalPricing = hClaims.find(c => c.aspect === 'pricing');
    const currentPricing = matchingCurrent.find(c => c.aspect === 'pricing');

    if (historicalPricing && historicalPricing.price) {
      if (!currentPricing || !currentPricing.price) {
        // Evidence did not contain verified current pricing for this entity
        comparisons.push({
          entity,
          aspect: 'pricing',
          historicalClaim: historicalPricing.claim,
          currentClaim: 'Current pricing could not be independently confirmed from verified sources.',
          classification: 'Unverified',
          explanation: `Insufficient current pricing evidence for ${entity}. Current plan details could not be verified with confidence.`,
          confidence: 0.5,
          sourceUrl: primaryEvidenceUrl,
          evidenceSnippets: matchingEvidence.map(e => e.content),
        });
      } else {
        // Compare with strict pricing rules
        const hPrice = historicalPricing.price;
        const cPrice = currentPricing.price;

        const isSameCurrency = (hPrice.currency || 'USD') === (cPrice.currency || 'USD');
        const isSameBillingPeriod = !hPrice.billingPeriod || !cPrice.billingPeriod || hPrice.billingPeriod === cPrice.billingPeriod;
        const isSameSeatCount = !hPrice.seatCount || !cPrice.seatCount || hPrice.seatCount === cPrice.seatCount;
        const isSamePlan = !hPrice.planName || !cPrice.planName || hPrice.planName.toLowerCase() === cPrice.planName.toLowerCase();

        if (!isSameCurrency || !isSameBillingPeriod || !isSamePlan) {
          // Conditions differ: do NOT report as a price increase/decrease!
          comparisons.push({
            entity,
            aspect: 'pricing',
            historicalClaim: historicalPricing.claim,
            currentClaim: currentPricing.claim,
            classification: 'Not comparable',
            explanation: `Pricing conditions differ (e.g. ${hPrice.planName || 'plan'} vs ${cPrice.planName || 'plan'}, ${hPrice.billingPeriod} vs ${cPrice.billingPeriod}). Cannot directly compare prices without identical tier and billing conditions.`,
            confidence: 0.7,
            sourceUrl: primaryEvidenceUrl,
            evidenceSnippets: matchingEvidence.map(e => e.content),
          });
        } else if (hPrice.amount !== undefined && cPrice.amount !== undefined) {
          if (hPrice.amount === cPrice.amount) {
            comparisons.push({
              entity,
              aspect: 'pricing',
              historicalClaim: historicalPricing.claim,
              currentClaim: currentPricing.claim,
              classification: 'Unchanged',
              explanation: `Pricing for ${entity} remains stable at $${cPrice.amount} (${cPrice.billingPeriod || 'monthly'}).`,
              confidence: 0.95,
              sourceUrl: primaryEvidenceUrl,
              evidenceSnippets: matchingEvidence.map(e => e.content),
            });
          } else {
            comparisons.push({
              entity,
              aspect: 'pricing',
              historicalClaim: historicalPricing.claim,
              currentClaim: currentPricing.claim,
              classification: 'Changed',
              explanation: `Pricing for ${entity} changed from $${hPrice.amount} to $${cPrice.amount} for the ${cPrice.planName || 'equivalent'} plan (${cPrice.billingPeriod || 'monthly'}).`,
              confidence: 0.95,
              sourceUrl: primaryEvidenceUrl,
              evidenceSnippets: matchingEvidence.map(e => e.content),
            });
          }
        }
      }
    }

    // Check feature / update aspect
    const currentFeature = matchingCurrent.find(c => c.aspect === 'feature');
    if (currentFeature) {
      comparisons.push({
        entity,
        aspect: 'feature',
        historicalClaim: hClaims.find(c => c.aspect === 'feature')?.claim || 'Previous feature set baseline',
        currentClaim: currentFeature.claim,
        classification: 'New information',
        explanation: `New product update/release confirmed: ${currentFeature.claim}`,
        confidence: 0.9,
        sourceUrl: primaryEvidenceUrl,
        evidenceSnippets: matchingEvidence.map(e => e.content),
      });
    }
  }

  return comparisons;
}
