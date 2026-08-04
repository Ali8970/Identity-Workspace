import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { filter, forkJoin } from 'rxjs';
import { routes } from './app.routes';
import { SessionStore } from './core/auth/session.store';
import { GlobalErrorService } from './core/error/global-error.service';
import { LanguageService } from './core/i18n/language.service';
import { applicationHeaderInterceptor } from './core/interceptors/application-header.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { languageInterceptor } from './core/interceptors/language.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        // Outermost, so the bar covers the whole request including retries below.
        loadingInterceptor,
        applicationHeaderInterceptor,
        languageInterceptor,
        csrfInterceptor,
        errorInterceptor,
      ]),
    ),
    provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
    }),
    // Bypass HTTP interceptors so i18n JSON is never rewritten by error handlers
    provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json',
      useHttpBackend: true,
    }),
    provideAppInitializer(() => {
      const language = inject(LanguageService);
      const session = inject(SessionStore);
      const router = inject(Router);
      const globalErrors = inject(GlobalErrorService);

      // Synchronous and off the critical path — it only stamps `data-theme` on
      // <html>. The inline script in index.html has already done this for the
      // pre-boot shell, so nothing repaints here.
      inject(ThemeService).init();

      // Drop stale banners when leaving a page (e.g. login → register).
      router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
        globalErrors.clear();
      });

      // Nothing renders until this completes, so the two requests it makes are the boot
      // critical path. They are independent — translations come from /i18n (same-origin),
      // the session probe is a cross-origin GET /me — but chaining them made boot cost
      // both round trips instead of the slower one. /me dominates (CORS preflight + a
      // ~140ms request), so running them together gets the /i18n fetch for free.
      //
      // Safe to parallelise because the Accept-Language header on /me comes from
      // LanguageService.current(), a signal seeded from the cookie in the constructor —
      // not from the translations this is loading.
      return forkJoin([language.init(), session.bootstrap()]);
    }),
  ],
};
