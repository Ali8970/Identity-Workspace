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

export function isApplicationAccessDenied(error: BroochError): boolean {
  return error.code === 'Auth.ApplicationAccessDenied';
}

export function isLoginIntentFailure(error: BroochError): boolean {
  return !!error.code?.startsWith('Account.LoginIntent.');
}

export function isNavigableRedirect(url: string | null | undefined): url is string {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeReturnUrl(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//');
}
