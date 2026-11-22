import { DateTime } from 'luxon';
import { ResolvedDateRange } from '../types/index.js';
import { config } from '../config.js';

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * Resolves temporal expressions in a user query relative to the application timezone (default Asia/Kolkata).
 * Converts local calendar day boundaries to UTC Date intervals.
 */
export function resolveDateRange(
  query: string,
  referenceDateUtc: Date = new Date(),
  timezone: string = config.APP_TIMEZONE
): ResolvedDateRange | null {
  const normalizedQuery = query.toLowerCase();
  const refDateTime = DateTime.fromJSDate(referenceDateUtc, { zone: timezone });

  // 1. Check for exact dates like "3 November", "3rd Nov", "November 3", "3rd of November"
  const dayMonthRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;
  const monthDayRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;

  let match = normalizedQuery.match(dayMonthRegex);
  let day: number | null = null;
  let month: number | null = null;
  let year: number = refDateTime.year;

  if (match) {
    day = parseInt(match[1], 10);
    month = MONTH_NAMES[match[2].toLowerCase()];
  } else {
    match = normalizedQuery.match(monthDayRegex);
    if (match) {
      month = MONTH_NAMES[match[1].toLowerCase()];
      day = parseInt(match[2], 10);
    }
  }

  // Check optional year in query e.g. "3 November 2026"
  const yearMatch = normalizedQuery.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  if (day !== null && month !== null) {
    // If no year specified and date is in future relative to reference, assume current or previous year
    let localDate = DateTime.fromObject({ year, month, day }, { zone: timezone });
    if (!yearMatch && localDate > refDateTime) {
      localDate = localDate.minus({ years: 1 });
    }

    const startOfDayUtc = localDate.startOf('day').toUTC().toJSDate();
    const endOfDayUtc = localDate.endOf('day').toUTC().toJSDate();

    return {
      originalText: match ? match[0] : `${day} ${month}`,
      startDateUtc: startOfDayUtc,
      endDateUtc: endOfDayUtc,
      timezone,
      isExact: true,
      description: `Exact date: ${localDate.toFormat('dd MMMM yyyy')} (${timezone})`,
    };
  }

  // 2. ISO / numeric dates: YYYY-MM-DD or DD/MM/YYYY
  const isoMatch = normalizedQuery.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const localDate = DateTime.fromObject({ year: y, month: m, day: d }, { zone: timezone });
    return {
      originalText: isoMatch[0],
      startDateUtc: localDate.startOf('day').toUTC().toJSDate(),
      endDateUtc: localDate.endOf('day').toUTC().toJSDate(),
      timezone,
      isExact: true,
      description: `Exact date: ${localDate.toISODate()}`,
    };
  }

  // 3. Relative terms: yesterday, today
  if (normalizedQuery.includes('yesterday')) {
    const localDate = refDateTime.minus({ days: 1 });
    return {
      originalText: 'yesterday',
      startDateUtc: localDate.startOf('day').toUTC().toJSDate(),
      endDateUtc: localDate.endOf('day').toUTC().toJSDate(),
      timezone,
      isExact: false,
      description: `Yesterday (${localDate.toISODate()})`,
    };
  }

  if (normalizedQuery.includes('today')) {
    const localDate = refDateTime;
    return {
      originalText: 'today',
      startDateUtc: localDate.startOf('day').toUTC().toJSDate(),
      endDateUtc: localDate.endOf('day').toUTC().toJSDate(),
      timezone,
      isExact: false,
      description: `Today (${localDate.toISODate()})`,
    };
  }

  // 4. Weekdays: e.g. "last Tuesday", "on Monday", "this Monday"
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const weekdayName = WEEKDAYS[i];
    const targetWeekdayNumber = i + 1; // Luxon: 1 = Monday, 7 = Sunday

    const isLastWeekday = normalizedQuery.includes(`last ${weekdayName}`);
    const isThisWeekday = normalizedQuery.includes(`this ${weekdayName}`);
    const isOnWeekday =
      normalizedQuery.includes(`on ${weekdayName}`) ||
      new RegExp(`\\b${weekdayName}\\b`, 'i').test(normalizedQuery);

    if (isLastWeekday || isThisWeekday || isOnWeekday) {
      let targetDate: DateTime;
      const currentWeekdayNumber = refDateTime.weekday;

      if (isLastWeekday) {
        // "Last X": explicitly in the prior week or most recent past occurrence at least 1 day ago
        const daysBack = (currentWeekdayNumber - targetWeekdayNumber + 7) % 7 || 7;
        targetDate = refDateTime.minus({ days: daysBack });
      } else {
        // "On Monday" or "this Monday"
        const daysBack = (currentWeekdayNumber - targetWeekdayNumber + 7) % 7;
        // If today is Monday and user says "on Monday", if asking historically, look back 7 days
        if (daysBack === 0 && (normalizedQuery.includes('asked') || normalizedQuery.includes('shortlisted') || normalizedQuery.includes('discussed'))) {
          targetDate = refDateTime.minus({ days: 7 });
        } else {
          targetDate = refDateTime.minus({ days: daysBack === 0 ? 0 : daysBack });
        }
      }

      const startOfDayUtc = targetDate.startOf('day').toUTC().toJSDate();
      const endOfDayUtc = targetDate.endOf('day').toUTC().toJSDate();

      return {
        originalText: isLastWeekday ? `last ${weekdayName}` : weekdayName,
        startDateUtc: startOfDayUtc,
        endDateUtc: endOfDayUtc,
        timezone,
        isExact: false,
        description: `${weekdayName.toUpperCase()} (${targetDate.toFormat('dd MMM yyyy')}) in ${timezone}`,
      };
    }
  }

  // 5. "last week", "past week"
  if (normalizedQuery.includes('last week') || normalizedQuery.includes('past week')) {
    const end = refDateTime.endOf('day').toUTC().toJSDate();
    const start = refDateTime.minus({ days: 7 }).startOf('day').toUTC().toJSDate();
    return {
      originalText: 'last week',
      startDateUtc: start,
      endDateUtc: end,
      timezone,
      isExact: false,
      description: `Past 7 days (${refDateTime.minus({ days: 7 }).toISODate()} to ${refDateTime.toISODate()})`,
    };
  }

  return null;
}
