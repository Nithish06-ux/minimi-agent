import { describe, it, expect } from 'vitest';
import { resolveDateRange } from '../../src/memory/dateResolver.js';
import { DateTime } from 'luxon';

describe('Date Resolver Unit Tests', () => {
  const referenceUtc = new Date('2026-11-22T14:30:00Z'); // Sunday 22 Nov 2026

  it('correctly resolves exact date: "3 November"', () => {
    const res = resolveDateRange('What did I ask you on 3 November?', referenceUtc, 'Asia/Kolkata');
    expect(res).not.toBeNull();
    expect(res?.isExact).toBe(true);

    const startKolkata = DateTime.fromJSDate(res!.startDateUtc, { zone: 'Asia/Kolkata' });
    expect(startKolkata.month).toBe(11);
    expect(startKolkata.day).toBe(3);
    expect(startKolkata.year).toBe(2026);
    expect(startKolkata.hour).toBe(0);
    expect(startKolkata.minute).toBe(0);
  });

  it('correctly resolves relative date: "yesterday"', () => {
    const res = resolveDateRange('What did we discuss yesterday?', referenceUtc, 'Asia/Kolkata');
    expect(res).not.toBeNull();
    const startKolkata = DateTime.fromJSDate(res!.startDateUtc, { zone: 'Asia/Kolkata' });
    // Reference is 22 Nov 8:00 PM IST, so yesterday is 21 Nov
    expect(startKolkata.day).toBe(21);
    expect(startKolkata.month).toBe(11);
  });

  it('correctly resolves relative weekday: "last Tuesday"', () => {
    const res = resolveDateRange('Last Tuesday I asked you about Postgres hosting', referenceUtc, 'Asia/Kolkata');
    expect(res).not.toBeNull();
    const startKolkata = DateTime.fromJSDate(res!.startDateUtc, { zone: 'Asia/Kolkata' });
    // Tuesday is weekday 2. Previous Tuesday before Sunday 22 Nov was 17 Nov
    expect(startKolkata.weekday).toBe(2);
    expect(startKolkata.day).toBe(17);
  });

  it('correctly resolves "on Monday"', () => {
    const res = resolveDateRange('On Monday we shortlisted 5 CRM tools', referenceUtc, 'Asia/Kolkata');
    expect(res).not.toBeNull();
    const startKolkata = DateTime.fromJSDate(res!.startDateUtc, { zone: 'Asia/Kolkata' });
    // Monday is weekday 1. Previous Monday before Sunday 22 Nov was 16 Nov
    expect(startKolkata.weekday).toBe(1);
    expect(startKolkata.day).toBe(16);
  });

  it('returns null when no temporal expression is present', () => {
    const res = resolveDateRange('What is a database index?', referenceUtc, 'Asia/Kolkata');
    expect(res).toBeNull();
  });
});
