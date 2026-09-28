/**
 * Pure year parser for catalog search queries.
 *
 * Understands a single year ("2018", "camry 2018") and a year range
 * ("лексус 2014-2019", "2014–2019" with an en/em dash). A standalone
 * four-digit token is always a year candidate: candidates inside
 * [MIN_YEAR, currentYear + 1] become the year range, candidates outside it
 * are ignored (dropped from the text, no year emitted). Digits glued to
 * letters ("B2000") are name text, not year candidates.
 */
export const MIN_YEAR = 1950;

export function maxSearchYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1;
}

export interface ParsedYearQuery {
  /** The query text with year candidate tokens removed. */
  text: string;
  yearFrom?: number;
  yearTo?: number;
}

// Year tokens must not be glued to letters or other digits.
const RANGE_PATTERN =
  /(?<![\p{L}\p{N}])(\d{4})\s*[-–—]\s*(\d{4})(?![\p{L}\p{N}])/gu;
const YEAR_PATTERN = /(?<![\p{L}\p{N}])(\d{4})(?![\p{L}\p{N}])/gu;

function isValidYear(year: number, maxYear: number): boolean {
  return year >= MIN_YEAR && year <= maxYear;
}

export function parseYearQuery(
  raw: string,
  now: Date = new Date(),
): ParsedYearQuery {
  const maxYear = maxSearchYear(now);
  let text = ` ${raw} `;
  const years: number[] = [];
  let range: { from: number; to: number } | undefined;

  text = text.replace(RANGE_PATTERN, (_match, a: string, b: string) => {
    const from = Number(a);
    const to = Number(b);
    if (isValidYear(from, maxYear) && isValidYear(to, maxYear)) {
      range = from <= to ? { from, to } : { from: to, to: from };
    }
    return " ";
  });

  text = text.replace(YEAR_PATTERN, (_match, y: string) => {
    const year = Number(y);
    if (isValidYear(year, maxYear)) {
      years.push(year);
    }
    return " ";
  });

  const result: ParsedYearQuery = { text: text.replace(/\s+/g, " ").trim() };

  if (range) {
    result.yearFrom = range.from;
    result.yearTo = range.to;
  } else if (years.length > 0) {
    result.yearFrom = Math.min(...years);
    result.yearTo = Math.max(...years);
  }

  return result;
}
