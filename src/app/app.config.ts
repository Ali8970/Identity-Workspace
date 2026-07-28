import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { switchMap } from 'rxjs';
import { routes } from './app.routes';
import { SessionStore } from './core/auth/session.store';
import { LanguageService } from './core/i18n/language.service';
import { applicationHeaderInterceptor } from './core/interceptors/application-header.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { languageInterceptor } from './core/interceptors/language.interceptor';
import { mockApiInterceptor } from './core/mock/mock-api.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        applicationHeaderInterceptor,
        languageInterceptor,
        csrfInterceptor,
        ...(environment.useMockApi ? [mockApiInterceptor] : []),
        errorInterceptor,
      ]),
    ),
    provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
    }),
    // Bypass HTTP interceptors so i18n JSON is never rewritten by mock/error handlers
    provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json',
      useHttpBackend: true,
    }),
    provideAppInitializer(() => {
      const language = inject(LanguageService);
      const session = inject(SessionStore);
      return language.init().pipe(switchMap(() => session.bootstrap()));
    }),
  ],
};
