/**
 * Language preference shared across the Brooch web apps.
 *
 * Identity and the CRM are served from different subdomains of `brooch.sa`, so
 * `localStorage` — which is origin-scoped — cannot carry the chosen language across a
 * navigation between them. A cookie scoped to the parent domain can: whichever app the
 * user last switched language in writes it, and the other reads it on boot.
 *
 * Keep this file in sync with the copy in the Brooch CRM app.
 */

export type SharedLanguage = 'en' | 'ar';

const COOKIE_NAME = 'brooch.lang';
/** Parent domain the apps are served from; the cookie is only widened when we are on it. */
const SHARED_DOMAIN = 'brooch.sa';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The language chosen in any Brooch app, or `null` when none has been recorded yet. */
export function readSharedLanguage(): SharedLanguage | null {
  try {
    for (const part of document.cookie.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      if (part.slice(0, separator).trim() !== COOKIE_NAME) continue;
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      return value === 'ar' || value === 'en' ? value : null;
    }
  } catch {
    /* cookies unavailable — fall back to the local preference */
  }
  return null;
}

/** Publish the language to every Brooch app on the shared domain. */
export function writeSharedLanguage(lang: SharedLanguage): void {
  const attributes = [
    `${COOKIE_NAME}=${lang}`,
    'path=/',
    `max-age=${ONE_YEAR_SECONDS}`,
    'samesite=lax',
  ];
  const domain = sharedCookieDomain();
  if (domain) {
    attributes.push(`domain=${domain}`);
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

/**
 * `.brooch.sa` when served from that domain, otherwise `null` so the cookie stays host-only.
 * On `localhost` a host-only cookie is already shared between the apps, since cookies ignore
 * the port.
 */
function sharedCookieDomain(): string | null {
  const host = location.hostname;
  return host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`) ? `.${SHARED_DOMAIN}` : null;
}
