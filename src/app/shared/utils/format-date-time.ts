import { AppLanguage } from '@core/i18n/language.service';

/**
 * Formats a server timestamp for display, e.g. "Sep 22, 2026, 2:00 PM".
 *
 * Arabic keeps the Gregorian calendar: `ar-SA` defaults to Hijri, and a receipt should read the
 * same calendar as the bank statement it will be compared with. An unparseable value returns
 * `null` so the caller can leave the row out instead of rendering "Invalid Date".
 */
export function formatDateTime(
  value: string | null | undefined,
  language: AppLanguage,
): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * How long ago `then` was, as a phrase — "12 seconds ago", "قبل دقيقتين". Below five seconds
 * it returns `null`, and the caller says "just now" in its own words: `Intl` would say "now",
 * which reads oddly after "last checked".
 */
export function formatTimeAgo(then: number, now: number, language: AppLanguage): string | null {
  const seconds = Math.max(0, Math.round((now - then) / 1_000));
  if (seconds < 5) {
    return null;
  }
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  return seconds < 60
    ? format.format(-seconds, 'second')
    : format.format(-Math.floor(seconds / 60), 'minute');
}
