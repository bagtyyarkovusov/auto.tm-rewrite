const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days a confirmed contact phone stays reusable (ADR-0056: 7 days),
 * rounded up so a partial last day still counts. 0 once the window has ended;
 * the server already leaves such numbers out of `GET /me/contact-phones`.
 */
export function contactPhoneDaysLeft(
  reusableUntil: string,
  now: Date = new Date(),
): number {
  const until = Date.parse(reusableUntil);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, Math.ceil((until - now.getTime()) / DAY_MS));
}
