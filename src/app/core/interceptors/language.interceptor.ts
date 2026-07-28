import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HTTP_HEADERS } from '../../constants/app.constants';
import { LanguageService } from '../i18n/language.service';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }
  const language = inject(LanguageService);
  return next(
    req.clone({
      setHeaders: {
        [HTTP_HEADERS.acceptLanguage]: language.current(),
      },
    }),
  );
};
