import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiErrorHandler } from '../error/api-error-handler.service';
import { SILENT_ERROR } from '../error/http-context';
import { normalizeError } from '../error/normalize-error';
import { LanguageService } from '../i18n/language.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Never rewrite asset / i18n loads — TranslateHttpLoader needs HttpErrorResponse as-is
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const language = inject(LanguageService);
  const apiErrorHandler = inject(ApiErrorHandler);

  return next(req).pipe(
    catchError((error: unknown) => {
      const normalized = normalizeError(error, language.current());

      apiErrorHandler.handle(normalized, {
        url: req.url,
        method: req.method,
        silent: req.context.get(SILENT_ERROR),
      });

      return throwError(() => normalized);
    }),
  );
};
