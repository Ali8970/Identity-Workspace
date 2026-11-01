import { environment } from '../../../environments/environment';

export interface FieldValidationError {
  code: string;
  message: string;
}

export interface BroochError {
  status: number;
  code: string | null;
  message: string;
  messageKey: string | null;
  correlationId: string | null;
  traceId: string | null;
  redirectUrl: string | null;
  fieldErrors: Record<string, FieldValidationError[]> | null;
  requiredPermissions: string[] | null;
  retryAfterSeconds: number | null;
  raw: unknown;
}

/**
 * Shapes a failure that never travelled through the HTTP pipeline so it can be published on
 * the one global banner.
 *
 * The direct-to-provider tokenization call deliberately bypasses every interceptor (see
 * `MoyasarTokenizationService`), so its rejections would otherwise have nowhere to surface —
 * and growing a second, page-local error UI for them is exactly what the error-handling rules
 * forbid. `status: 0` marks it as client-side; there is no `traceId` because no Brooch request
 * was made.
 */
export function clientError(code: string, message: string): BroochError {
  return {
    status: 0,
    code,
    message,
    messageKey: null,
    correlationId: null,
    traceId: null,
    redirectUrl: null,
    fieldErrors: null,
    requiredPermissions: null,
    retryAfterSeconds: null,
    raw: null,
  };
}

export function isValidationError(error: BroochError): boolean {
  return error.code === 'Validation' || !!error.fieldErrors;
}

export function isRateLimited(error: BroochError): boolean {
  return (
    error.status === 429 ||
    error.code === 'Request.RateLimitExceeded' ||
    error.code === 'Auth.RateLimited'
  );
}

/**
 * True when a failure says nothing about the request itself — the network dropped, the server
 * hiccuped or asked us to slow down — so asking again later may well succeed.
 *
 * A 4xx refusal is an answer, not an outage: retrying a 404 or a 403 only repeats it. Status `0`
 * is how a request that never reached a server surfaces after normalization.
 */
export function isTransientError(error: BroochError): boolean {
  return error.status === 0 || error.status === 408 || error.status >= 500 || isRateLimited(error);
}

export function isApplicationAccessDenied(error: BroochError): boolean {
  return error.code === 'Auth.ApplicationAccessDenied';
}

export function isLoginIntentFailure(error: BroochError): boolean {
  return !!error.code?.startsWith('Account.LoginIntent.');
}

/** Every Brooch app, and so every SSO hand-off target, is served from this domain. */
const TRUSTED_REDIRECT_DOMAIN = 'brooch.sa';
/** Local sibling apps during `ng serve`; never trusted by a production build. */
const DEV_REDIRECT_HOSTS = ['localhost', '127.0.0.1'];

/**
 * Whether the browser may be handed to `url` (SSO redirectUrl, access-denied redirect, app
 * launcher). The backend already validates these; this allow-list is defence in depth so a
 * slipped check can never turn the login page into an open redirect.
 */
export function isNavigableRedirect(url: string | null | undefined): url is string {
  if (!url) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.username !== '' || parsed.password !== '') {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === TRUSTED_REDIRECT_DOMAIN || host.endsWith(`.${TRUSTED_REDIRECT_DOMAIN}`)) {
    return parsed.protocol === 'https:';
  }
  return (
    !environment.production &&
    DEV_REDIRECT_HOSTS.includes(host) &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  );
}

/**
 * A same-app path: one leading `/`, and no backslash or control character. Browsers read
 * `/\host` and `/<tab>/host` as `//host`, which leaves the origin.
 */
export function isSafeReturnUrl(value: string | null): value is string {
  return (
    value !== null &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    ![...value].some((char) => char === '\\' || char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f)
  );
}
