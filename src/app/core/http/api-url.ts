import { CSRF_EXEMPT_PATHS } from '../../constants/api-routes';
import { environment } from '@env/environment';

const API_BASE = environment.apiBaseUrl.replace(/\/$/, '');
const API_BASE_PATH = new URL(API_BASE).pathname;

/**
 * True only for requests to the Brooch API this build talks to.
 *
 * Interceptors attach the session cookie, the CSRF token and the application header, so
 * matching any URL that merely contains `/api/` would hand those to a third party the day one
 * is called. i18n bundles and the payment provider never match.
 */
export function isApiRequest(url: string): boolean {
  return url.startsWith(`${API_BASE}/`);
}

/**
 * True for the anonymous auth endpoints that skip CSRF and never end a session on 401.
 *
 * Matched on the exact path: a substring test would also exempt any future endpoint that
 * happens to contain one of these paths (for example `/auth/login-history`).
 */
export function isCsrfExemptRequest(url: string): boolean {
  const path = new URL(url, API_BASE).pathname.replace(/\/$/, '');
  return CSRF_EXEMPT_PATHS.some((exempt) => path === `${API_BASE_PATH}${exempt}`);
}
