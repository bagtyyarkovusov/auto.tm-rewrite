/**
 * The date a scheduled account deletion takes effect, written in the app
 * language for the restore prompt. The prompt's copy puts it before a full
 * stop, and some locales (Russian: "26 октября 2026 г.") end the date with
 * their own, so that one is dropped to avoid a doubled period.
 */
export function formatDeletionDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
    .format(new Date(iso))
    .replace(/\.$/, "");
}
