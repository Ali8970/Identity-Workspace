import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '../../models/api-response.model';
import { BroochError } from './brooch-error.model';

function pickMessage(problem: ProblemDetails | undefined, fallback: string, lang: string): string {
  const message = problem?.message;
  if (message) {
    if (typeof message === 'string') {
      return message;
    }
    const localized = lang.startsWith('ar') ? message.ar || message.en : message.en || message.ar;
    if (localized) {
      return localized;
    }
  }
  return problem?.detail ?? problem?.title ?? problem?.code ?? fallback;
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
      (typeof extensions['redirectUrl'] === 'string' ? (extensions['redirectUrl'] as string) : null);
    const code =
      problem?.code ??
      (typeof error.statusText === 'string' && error.statusText.includes('.')
        ? error.statusText
        : null);

    return {
      status: error.status,
      code,
      message: pickMessage(problem, code || 'Request failed', lang),
      messageKey: problem?.messageKey ?? code,
      correlationId: problem?.correlationId ?? null,
      redirectUrl,
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
      redirectUrl: null,
      raw: error,
    };
  }

  return {
    status: 0,
    code: null,
    message: 'Unexpected error',
    messageKey: null,
    correlationId: null,
    redirectUrl: null,
    raw: error,
  };
}
