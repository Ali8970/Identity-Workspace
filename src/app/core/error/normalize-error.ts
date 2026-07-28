import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails, ValidationFieldError } from '../../models/api-response.model';
import { BroochError, FieldValidationError } from './error.model';

function pickLocalizedMessage(
  message: string | { en?: string; ar?: string } | undefined,
  lang: string,
): string | null {
  if (!message) {
    return null;
  }
  if (typeof message === 'string') {
    return message;
  }
  return lang.startsWith('ar')
    ? message.ar || message.en || null
    : message.en || message.ar || null;
}

function pickMessage(problem: ProblemDetails | undefined, fallback: string, lang: string): string {
  const localized = pickLocalizedMessage(problem?.message, lang);
  if (localized) {
    return localized;
  }
  return problem?.detail ?? problem?.title ?? problem?.code ?? fallback;
}

function parseFieldErrors(
  problem: ProblemDetails | undefined,
  lang: string,
): Record<string, FieldValidationError[]> | null {
  const errors = problem?.errors;
  if (!errors || typeof errors !== 'object') {
    return null;
  }

  const parsed: Record<string, FieldValidationError[]> = {};
  for (const [field, items] of Object.entries(errors)) {
    if (!Array.isArray(items)) {
      continue;
    }
    parsed[field] = items.map((item: ValidationFieldError) => ({
      code: item.code ?? 'Validation',
      message: pickLocalizedMessage(item.message, lang) ?? item.code ?? 'Invalid value',
    }));
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

function parseRetryAfter(error: HttpErrorResponse): number | null {
  const header = error.headers.get('Retry-After');
  if (!header) {
    return null;
  }
  const seconds = Number.parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function normalizeError(error: unknown, lang = 'en'): BroochError {
  if (error instanceof HttpErrorResponse) {
    const problem = (error.error ?? undefined) as ProblemDetails | undefined;
    const extensions = problem?.extensions ?? {};
    const topLevelRedirect =
      problem && typeof (problem as unknown as { redirectUrl?: unknown }).redirectUrl === 'string'
        ? (problem as unknown as { redirectUrl: string }).redirectUrl
        : null;
    const redirectUrl =
      topLevelRedirect ??
      (typeof extensions['redirectUrl'] === 'string'
        ? (extensions['redirectUrl'] as string)
        : null);
    const code =
      problem?.code ??
      (typeof error.statusText === 'string' && error.statusText.includes('.')
        ? error.statusText
        : null);
    const retryAfterSeconds =
      parseRetryAfter(error) ??
      (error.status === 429 || code === 'Request.RateLimitExceeded' || code === 'Auth.RateLimited'
        ? 30
        : null);

    return {
      status: error.status,
      code,
      message: pickMessage(problem, code || 'Request failed', lang),
      messageKey: problem?.messageKey ?? code,
      correlationId: problem?.correlationId ?? problem?.requestId ?? null,
      traceId: problem?.traceId ?? null,
      redirectUrl,
      fieldErrors: parseFieldErrors(problem, lang),
      requiredPermissions: problem?.requiredPermissions ?? null,
      retryAfterSeconds,
      raw: error,
    };
  }

  // Already-normalized BroochError (or similar) from a prior interceptor hop
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'code' in error &&
    'message' in error
  ) {
    return error as BroochError;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      status: 0,
      code: null,
      message: String((error as { message: unknown }).message),
      messageKey: null,
      correlationId: null,
      traceId: null,
      redirectUrl: null,
      fieldErrors: null,
      requiredPermissions: null,
      retryAfterSeconds: null,
      raw: error,
    };
  }

  return {
    status: 0,
    code: null,
    message: 'Unexpected error',
    messageKey: null,
    correlationId: null,
    traceId: null,
    redirectUrl: null,
    fieldErrors: null,
    requiredPermissions: null,
    retryAfterSeconds: null,
    raw: error,
  };
}
