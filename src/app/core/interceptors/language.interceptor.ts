import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HTTP_HEADERS } from '../http/http-headers';
import { LanguageService } from '../i18n/language.service';
import { isApiRequest } from '../http/api-url';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
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
