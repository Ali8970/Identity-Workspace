import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BroochError } from './error.model';
import { normalizeError } from './normalize-error';

function httpError(init: {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  statusText?: string;
}): HttpErrorResponse {
  return new HttpErrorResponse({
    status: init.status ?? 400,
    statusText: init.statusText ?? 'Bad Request',
    error: init.body ?? null,
    headers: new HttpHeaders(init.headers ?? {}),
  });
}

describe('normalizeError', () => {
  describe('message selection', () => {
    it('picks the Arabic side of a bilingual message when the language is ar', () => {
      const result = normalizeError(
        httpError({ body: { message: { en: 'Not allowed', ar: 'غير مسموح' } } }),
        'ar',
      );
      expect(result.message).toBe('غير مسموح');
    });

    it('picks the English side when the language is en', () => {
      const result = normalizeError(
        httpError({ body: { message: { en: 'Not allowed', ar: 'غير مسموح' } } }),
        'en',
      );
      expect(result.message).toBe('Not allowed');
    });

    it('falls back to the other language when the preferred side is missing', () => {
      const result = normalizeError(httpError({ body: { message: { en: 'Only English' } } }), 'ar');
      expect(result.message).toBe('Only English');
    });

    it('accepts a plain string message', () => {
      const result = normalizeError(httpError({ body: { message: 'Plain' } }), 'en');
      expect(result.message).toBe('Plain');
    });

    it('falls back through detail, then title, then code', () => {
      expect(normalizeError(httpError({ body: { detail: 'D', title: 'T' } }), 'en').message).toBe(
        'D',
      );
      expect(normalizeError(httpError({ body: { title: 'T' } }), 'en').message).toBe('T');
      expect(normalizeError(httpError({ body: { code: 'Some.Code' } }), 'en').message).toBe(
        'Some.Code',
      );
    });
  });

  describe('field errors', () => {
    it('flattens the errors map and localises each entry', () => {
      const result = normalizeError(
        httpError({
          body: {
            code: 'Validation',
            errors: {
              email: [{ code: 'Invalid', message: { en: 'Bad email', ar: 'بريد غير صالح' } }],
            },
          },
        }),
        'en',
      );
      expect(result.fieldErrors).toEqual({
        email: [{ code: 'Invalid', message: 'Bad email' }],
      });
    });

    it('is null when the errors map is absent or empty', () => {
      expect(normalizeError(httpError({ body: { code: 'X' } }), 'en').fieldErrors).toBeNull();
      expect(normalizeError(httpError({ body: { errors: {} } }), 'en').fieldErrors).toBeNull();
    });

    it('skips non-array entries rather than throwing', () => {
      const result = normalizeError(
        httpError({ body: { errors: { email: 'not-an-array' } } }),
        'en',
      );
      expect(result.fieldErrors).toBeNull();
    });
  });

  describe('retry-after', () => {
    it('reads the Retry-After header', () => {
      const result = normalizeError(
        httpError({ status: 429, headers: { 'Retry-After': '60' } }),
        'en',
      );
      expect(result.retryAfterSeconds).toBe(60);
    });

    it('defaults to 30s for a 429 with no header', () => {
      const result = normalizeError(httpError({ status: 429 }), 'en');
      expect(result.retryAfterSeconds).toBe(30);
    });

    it('defaults to 30s for a rate-limit code on another status', () => {
      const result = normalizeError(
        httpError({ status: 400, body: { code: 'Request.RateLimitExceeded' } }),
        'en',
      );
      expect(result.retryAfterSeconds).toBe(30);
    });

    it('ignores a non-numeric or non-positive header', () => {
      expect(
        normalizeError(httpError({ status: 400, headers: { 'Retry-After': 'soon' } }), 'en')
          .retryAfterSeconds,
      ).toBeNull();
      expect(
        normalizeError(httpError({ status: 400, headers: { 'Retry-After': '0' } }), 'en')
          .retryAfterSeconds,
      ).toBeNull();
    });
  });

  describe('redirectUrl', () => {
    it('prefers a top-level redirectUrl', () => {
      const result = normalizeError(
        httpError({
          body: {
            redirectUrl: 'https://top.example',
            extensions: { redirectUrl: 'https://ext.example' },
          },
        }),
        'en',
      );
      expect(result.redirectUrl).toBe('https://top.example');
    });

    it('falls back to extensions.redirectUrl', () => {
      const result = normalizeError(
        httpError({ body: { extensions: { redirectUrl: 'https://ext.example' } } }),
        'en',
      );
      expect(result.redirectUrl).toBe('https://ext.example');
    });

    it('is null when neither is a string', () => {
      expect(
        normalizeError(httpError({ body: { extensions: { redirectUrl: 42 } } }), 'en').redirectUrl,
      ).toBeNull();
    });
  });

  describe('non-HttpErrorResponse input', () => {
    it('passes an already-normalized BroochError straight through', () => {
      const existing: BroochError = {
        status: 403,
        code: 'Auth.PermissionDenied',
        message: 'Denied',
        messageKey: null,
        correlationId: null,
        traceId: null,
        redirectUrl: null,
        fieldErrors: null,
        requiredPermissions: null,
        retryAfterSeconds: null,
        raw: null,
      };
      expect(normalizeError(existing, 'en')).toBe(existing);
    });

    it('wraps a plain Error', () => {
      const result = normalizeError(new Error('boom'), 'en');
      expect(result.status).toBe(0);
      expect(result.message).toBe('boom');
    });

    it('produces a generic shape for a value with no message', () => {
      const result = normalizeError('just a string', 'en');
      expect(result.status).toBe(0);
      expect(result.message).toBe('Unexpected error');
    });
  });

  it('carries correlationId, traceId and requiredPermissions through', () => {
    const result = normalizeError(
      httpError({
        status: 403,
        body: {
          code: 'Auth.PermissionDenied',
          correlationId: 'corr-1',
          traceId: 'trace-1',
          requiredPermissions: ['identity.roles.read'],
        },
      }),
      'en',
    );
    expect(result.correlationId).toBe('corr-1');
    expect(result.traceId).toBe('trace-1');
    expect(result.requiredPermissions).toEqual(['identity.roles.read']);
  });

  it('falls back to requestId when correlationId is absent', () => {
    const result = normalizeError(httpError({ body: { requestId: 'req-9' } }), 'en');
    expect(result.correlationId).toBe('req-9');
  });
});
