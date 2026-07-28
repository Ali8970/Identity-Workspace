import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { GlobalErrorBanner } from '../global-error-banner/global-error-banner';

@Component({
  selector: 'app-auth-layout',
  imports: [TranslatePipe, GlobalErrorBanner],
  template: `
    <div class="auth-page">
      <aside class="auth-page__hero" aria-hidden="true">
        <div class="auth-page__hero-inner">
          <div class="auth-page__logo">
            <span class="auth-page__mark">B</span>
            <div>
              <p class="auth-page__logo-name">Brooch</p>
              <p class="auth-page__logo-sub">{{ 'auth.layout.product' | translate }}</p>
            </div>
          </div>

          <h2 class="auth-page__hero-title">{{ 'auth.layout.heroTitle' | translate }}</h2>
          <p class="auth-page__hero-lead">{{ 'auth.layout.heroLead' | translate }}</p>

          <ul class="auth-page__features">
            <li>
              <span class="auth-page__feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                </svg>
              </span>
              {{ 'auth.layout.featureSecurity' | translate }}
            </li>
            <li>
              <span class="auth-page__feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              {{ 'auth.layout.featureApps' | translate }}
            </li>
            <li>
              <span class="auth-page__feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
                </svg>
              </span>
              {{ 'auth.layout.featureTeams' | translate }}
            </li>
          </ul>
        </div>
      </aside>

      <main class="auth-page__main" id="main-content">
        <div class="auth-page__toolbar">
          <div
            class="auth-page__lang"
            role="group"
            [attr.aria-label]="'shell.language' | translate"
          >
            <button
              type="button"
              class="auth-page__lang-btn"
              [class.auth-page__lang-btn--active]="language.current() === 'en'"
              (click)="setLanguage('en')"
            >
              EN
            </button>
            <button
              type="button"
              class="auth-page__lang-btn"
              [class.auth-page__lang-btn--active]="language.current() === 'ar'"
              (click)="setLanguage('ar')"
            >
              AR
            </button>
          </div>
        </div>

        <div class="auth-page__card fade-up">
          <app-global-error-banner variant="auth" />
          <ng-content />
        </div>
      </main>
    </div>
  `,
})
export class AuthLayout {
  protected readonly language = inject(LanguageService);

  protected setLanguage(lang: 'en' | 'ar'): void {
    if (lang !== this.language.current()) {
      this.language.setLanguage(lang);
    }
  }
}
