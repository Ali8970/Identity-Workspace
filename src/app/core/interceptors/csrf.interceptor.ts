import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { CSRF_EXEMPT_PATHS } from '../../constants/api-routes';
import { HTTP_HEADERS } from '../../constants/app.constants';
import { CsrfService } from '../auth/csrf.service';

export const CSRF_RETRIED = new HttpContextToken<boolean>(() => false);

function isUnsafe(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}

function isExempt(url: string): boolean {
  return CSRF_EXEMPT_PATHS.some((path) => url.includes(path));
}

/**
 * Recognises an antiforgery rejection in BOTH shapes it can arrive in.
 *
 * `errorInterceptor` is registered last, which makes it the innermost interceptor —
 * so on failure it runs FIRST and rethrows a normalized `BroochError`, not the original
 * `HttpErrorResponse`. Testing only for `instanceof HttpErrorResponse` therefore never
 * matched in the real chain and the retry below was dead code.
 * See csrf.interceptor.spec.ts, which pins both shapes.
 */
function isAntiforgeryFailure(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { code?: string } | null;
    return error.status === 400 && body?.code === 'Auth.AntiforgeryFailed';
  }
  if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
    const normalized = error as { status: number; code: string | null };
    return normalized.status === 400 && normalized.code === 'Auth.AntiforgeryFailed';
  }
  return false;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/') || !isUnsafe(req.method) || isExempt(req.url)) {
    return next(req);
  }

  const csrf = inject(CsrfService);

  const send = (token: string | null) =>
    next(
      req.clone({
        setHeaders: token ? { [HTTP_HEADERS.csrf]: token } : {},
      }),
    ).pipe(
      catchError((error: unknown) => {
        if (req.context.get(CSRF_RETRIED) || !isAntiforgeryFailure(error)) {
          return throwError(() => error);
        }
        csrf.invalidate();
        return csrf.prime().pipe(
          switchMap((fresh) =>
            next(
              req.clone({
                // Carry the caller's context forward — a fresh HttpContext would drop
                // whatever they set on the original request (e.g. SILENT_ERROR).
                context: req.context.set(CSRF_RETRIED, true),
                setHeaders: fresh ? { [HTTP_HEADERS.csrf]: fresh } : {},
              }),
            ),
          ),
        );
      }),
    );

  const existing = csrf.getToken();
  if (existing) {
    return send(existing);
  }

  return csrf.prime().pipe(switchMap((token) => send(token)));
};
