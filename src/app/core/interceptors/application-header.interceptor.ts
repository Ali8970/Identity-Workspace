import { HttpInterceptorFn } from '@angular/common/http';
import { APP_KEY, HTTP_HEADERS } from '../../constants/app.constants';
import { environment } from '../../../environments/environment';

function isLocalDevHost(): boolean {
  const host = globalThis.location?.hostname ?? '';
  return host === 'dev.account.brooch.sa' || host === 'localhost' || host === '127.0.0.1';
}

export const applicationHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const headers: Record<string, string> = {
    [HTTP_HEADERS.application]: APP_KEY,
  };

  // Compile-time off in prod builds; hostname also blocks a development bundle
  // served from stg/prod (same env file as `ng serve`).
  if (environment.sendDevClientHeader && isLocalDevHost()) {
    headers[HTTP_HEADERS.devClient] = 'true';
  }

  return next(
    req.clone({
      setHeaders: headers,
      withCredentials: true,
    }),
  );
};
