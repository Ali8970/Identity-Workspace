import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LanguageService } from '../i18n/language.service';
import { normalizeError } from '../error/normalize-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Never rewrite asset / i18n loads — TranslateHttpLoader needs HttpErrorResponse as-is
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const language = inject(LanguageService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const normalized = normalizeError(error, language.current());
        return throwError(() => normalized);
      }
      return throwError(() => normalizeError(error, language.current()));
    }),
  );
};
