import { HttpInterceptorFn } from '@angular/common/http';
import { APP_KEY, HTTP_HEADERS } from '../../constants/app.constants';

export const applicationHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: {
        [HTTP_HEADERS.application]: APP_KEY,
      },
      withCredentials: true,
    }),
  );
};
