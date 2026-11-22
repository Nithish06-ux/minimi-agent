import { describe, it, expect } from 'vitest';
import { compareHistoricalAndCurrent } from '../../src/research/comparison.js';
import { ResearchEvidenceItem } from '../../src/types/index.js';

describe('Historical Comparison Engine Unit Tests', () => {
  it('classifies unchanged pricing when exact amount, plan, and billing match', () => {
    const historicalText = 'Zoho CRM Enterprise plan is $40/user/month billed annually.';
    const evidenceItems: ResearchEvidenceItem[] = [
      {
        title: 'Zoho CRM Pricing Official',
        url: 'https://www.zoho.com/crm/pricing',
        content: 'Zoho CRM Enterprise plan remains $40/user/month billed annually.',
        isOfficial: true,
        retrievedAt: new Date(),
      },
    ];

    const results = compareHistoricalAndCurrent({ historicalText, evidenceItems });
    const zohoComp = results.find(r => r.entity.toLowerCase() === 'zoho');
    expect(zohoComp).toBeDefined();
    expect(zohoComp?.classification).toBe('Unchanged');
  });

  it('classifies changed pricing when prices differ on same plan & conditions', () => {
    const historicalText = 'Freshsales Pro plan is $39/user/month billed annually.';
    const evidenceItems: ResearchEvidenceItem[] = [
      {
        title: 'Freshsales Pricing 2026',
        url: 'https://www.freshworks.com/pricing',
        content: 'Freshsales Pro plan increased to $47/user/month billed annually.',
        isOfficial: true,
        retrievedAt: new Date(),
      },
    ];

    const results = compareHistoricalAndCurrent({ historicalText, evidenceItems });
    const freshComp = results.find(r => r.entity.toLowerCase() === 'freshsales');
    expect(freshComp).toBeDefined();
    expect(freshComp?.classification).toBe('Changed');
  });

  it('flags "Not comparable" if billing cycles differ (monthly vs annual)', () => {
    const historicalText = 'Render Standard plan is $35/month.';
    const evidenceItems: ResearchEvidenceItem[] = [
      {
        title: 'Render Annual Contract Plans',
        url: 'https://render.com/enterprise',
        content: 'Render Standard Enterprise plan is $300/year.',
        isOfficial: true,
        retrievedAt: new Date(),
      },
    ];

    const results = compareHistoricalAndCurrent({ historicalText, evidenceItems });
    const renderComp = results.find(r => r.entity.toLowerCase() === 'render');
    expect(renderComp).toBeDefined();
    expect(renderComp?.classification).toBe('Not comparable');
  });

  it('flags "Unverified" when no current verified evidence exists for historical entity', () => {
    const historicalText = 'Heroku Postgres Standard is $50/month.';
    const evidenceItems: ResearchEvidenceItem[] = [
      {
        title: 'General cloud news',
        url: 'https://news.example.com',
        content: 'Overview of latest cloud compute updates in 2026.',
        isOfficial: false,
        retrievedAt: new Date(),
      },
    ];

    const results = compareHistoricalAndCurrent({ historicalText, evidenceItems });
    const herokuComp = results.find(r => r.entity.toLowerCase().includes('heroku'));
    expect(herokuComp).toBeDefined();
    expect(herokuComp?.classification).toBe('Unverified');
  });

  it('detects newly shipped features as "New information"', () => {
    const historicalText = 'Pipedrive Professional plan is $49/seat/month.';
    const evidenceItems: ResearchEvidenceItem[] = [
      {
        title: 'Pipedrive Changelog',
        url: 'https://pipedrive.com/changelog',
        content: 'Pipedrive released AI Sales Assistant 2.0 with automated email summaries.',
        isOfficial: true,
        retrievedAt: new Date(),
      },
    ];

    const results = compareHistoricalAndCurrent({ historicalText, evidenceItems });
    const featureComp = results.find(r => r.aspect === 'feature');
    expect(featureComp).toBeDefined();
    expect(featureComp?.classification).toBe('New information');
  });
});
