import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { HttpActivityService } from '../loading/http-activity.service';
import { SKIP_LOADING } from '../loading/loading-context';

/**
 * Feeds every API call into the global loading bar. Assets and i18n bundles are
 * not work the user is waiting on, so they stay out of the count.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/') || req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  const activity = inject(HttpActivityService);
  activity.begin();

  // finalize() also fires on unsubscribe, so cancelled requests release the count.
  return next(req).pipe(finalize(() => activity.end()));
};
