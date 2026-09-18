/**
 * Light / dark preference shared across the Brooch web apps.
 *
 * Same mechanism as `shared-language-cookie.ts`: `localStorage` is origin-scoped, so a
 * cookie on the parent `brooch.sa` domain carries the theme across a navigation between
 * Account and LandLord. Whichever app the user last toggled in writes it; the other reads
 * it on boot (including the pre-paint script in `index.html`).
 *
 * Keep this file in sync with `brooch-theme.util.ts` in the LandLord app.
 */

export type SharedTheme = 'light' | 'dark';

const COOKIE_NAME = 'brooch.theme';
/** Parent domain the apps are served from; the cookie is only widened when we are on it. */
const SHARED_DOMAIN = 'brooch.sa';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The theme chosen in any Brooch app, or `null` when none has been recorded yet. */
export function readSharedTheme(): SharedTheme | null {
  try {
    for (const part of document.cookie.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      if (part.slice(0, separator).trim() !== COOKIE_NAME) continue;
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      return value === 'light' || value === 'dark' ? value : null;
    }
  } catch {
    /* cookies unavailable — fall back to the local preference */
  }
  return null;
}

/** Publish the theme to every Brooch app on the shared domain. */
export function writeSharedTheme(theme: SharedTheme): void {
  const attributes = [
    `${COOKIE_NAME}=${theme}`,
    'path=/',
    `max-age=${ONE_YEAR_SECONDS}`,
    'samesite=lax',
  ];
  const host = location.hostname;
  if (host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`)) {
    attributes.push(`domain=.${SHARED_DOMAIN}`);
  }
  if (location.protocol === 'https:') {
    attributes.push('secure');
  }
  try {
    document.cookie = attributes.join('; ');
  } catch {
    /* cookies unavailable — the local preference still applies to this app */
  }
}
