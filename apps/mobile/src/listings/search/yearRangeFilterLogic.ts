const MIN_YEAR = 1900;

function getMaxYear(): number {
  return new Date().getFullYear() + 1;
}

/** Parse raw year text into a valid number or `undefined`.
 *  Rejects non-4-digit input and out-of-range values. */
export function parseYearInput(text: string): number | undefined {
  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) {
    return undefined;
  }
  if (digits.length === 4) {
    const num = parseInt(digits, 10);
    const maxYear = getMaxYear();
    if (num >= MIN_YEAR && num <= maxYear) {
      return num;
    }
  }
  return undefined;
}
