import { EntityClaim } from '../types/index.js';

const PRICE_REGEX = /\$(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(?:\/|\s*per\s*)(?:seat|user|month|mo|year|yr|cu-hour|gb))?/gi;

/**
 * Extracts entities, plans, and claims from message content or search snippets.
 */
export function extractClaimsAndEntities(text: string): EntityClaim[] {
  const claims: EntityClaim[] = [];
  const lines = text.split(/(?:\r?\n)+|(?<=\.)\s+/).filter(l => l.trim().length > 10);

  // Common entity keywords to look for
  const entityKeywords = [
    'HubSpot', 'Salesforce', 'Pipedrive', 'Zoho', 'Freshsales',
    'Neon', 'Supabase', 'Render', 'Railway', 'AWS RDS', 'Heroku',
    'PostgreSQL', 'Postgres', 'CockroachDB', 'PlanetScale'
  ];

  for (const line of lines) {
    const matchedEntity = entityKeywords.find(k => new RegExp(`\\b${k}\\b`, 'i').test(line));
    if (!matchedEntity) continue;

    // Check for pricing in this line
    const priceMatches = Array.from(line.matchAll(PRICE_REGEX));
    if (priceMatches.length > 0) {
      for (const m of priceMatches) {
        const rawAmount = m[1].replace(/,/g, '');
        const amount = parseFloat(rawAmount);
        const lineLower = line.toLowerCase();

        const matchText = m[0].toLowerCase();
        let billingPeriod: 'monthly' | 'annual' | 'one-time' | 'custom' = 'monthly';
        if (
          matchText.includes('/yr') ||
          matchText.includes('yr') ||
          matchText.includes('year') ||
          lineLower.includes('annual') ||
          lineLower.includes('yearly') ||
          lineLower.includes('/yr') ||
          lineLower.includes('/year') ||
          lineLower.includes('per year')
        ) {
          billingPeriod = 'annual';
        } else if (
          matchText.includes('/mo') ||
          matchText.includes('mo') ||
          matchText.includes('month') ||
          lineLower.includes('/mo') ||
          lineLower.includes('per month') ||
          lineLower.includes('monthly')
        ) {
          billingPeriod = 'monthly';
        }

        let seatCount: string | number | undefined;
        const seatMatch = lineLower.match(/(\d+)\s*(?:seat|user|person|people)/);
        if (seatMatch) {
          seatCount = parseInt(seatMatch[1], 10);
        }

        let planName: string | undefined;
        const planMatch = line.match(/\b(Free|Starter|Pro|Professional|Enterprise|Standard|Team|Growth)\b/i);
        if (planMatch) {
          planName = planMatch[0];
        }

        claims.push({
          entity: matchedEntity,
          aspect: 'pricing',
          claim: line.trim(),
          price: {
            amount,
            currency: 'USD',
            billingPeriod,
            seatCount,
            planName,
            rawText: m[0],
          },
          sourceText: line.trim(),
        });
      }
    }

    // Check for feature / update mentions
    const featureKeywords = ['shipped', 'released', 'launched', 'announced', 'added', 'deprecated', 'feature', 'ai assistant', 'autoscaling', 'preview'];
    const hasFeature = featureKeywords.some(f => line.toLowerCase().includes(f));
    if (hasFeature) {
      claims.push({
        entity: matchedEntity,
        aspect: 'feature',
        claim: line.trim(),
        sourceText: line.trim(),
      });
    }

    // Fallback general claim if neither price nor feature specifically matched
    if (priceMatches.length === 0 && !hasFeature) {
      claims.push({
        entity: matchedEntity,
        aspect: 'general',
        claim: line.trim(),
        sourceText: line.trim(),
      });
    }
  }

  return claims;
}
