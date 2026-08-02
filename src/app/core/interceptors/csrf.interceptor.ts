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

function isAntiforgeryFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  const body = error.error as { code?: string } | null;
  return error.status === 400 && body?.code === 'Auth.AntiforgeryFailed';
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
