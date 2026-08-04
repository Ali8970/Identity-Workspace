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
import { filter, switchMap } from 'rxjs';
import { routes } from './app.routes';
import { SessionStore } from './core/auth/session.store';
import { GlobalErrorService } from './core/error/global-error.service';
import { LanguageService } from './core/i18n/language.service';
import { applicationHeaderInterceptor } from './core/interceptors/application-header.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { languageInterceptor } from './core/interceptors/language.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

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

      // Drop stale banners when leaving a page (e.g. login → register).
      router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
        globalErrors.clear();
      });

      return language.init().pipe(switchMap(() => session.bootstrap()));
    }),
  ],
};
