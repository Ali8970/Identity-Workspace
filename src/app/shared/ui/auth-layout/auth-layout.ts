import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';
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

      <div class="auth-page__strip" aria-hidden="true">
        <span class="auth-page__mark">B</span>
        <div>
          <p class="auth-page__strip-name">Brooch</p>
          <p class="auth-page__strip-sub">{{ 'auth.layout.product' | translate }}</p>
        </div>
      </div>

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

          <button
            type="button"
            class="auth-page__icon-btn"
            (click)="theme.toggle()"
            [attr.aria-label]="(isDark() ? 'shell.themeLight' : 'shell.themeDark') | translate"
          >
            @if (isDark()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
              </svg>
            }
          </button>
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
  protected readonly theme = inject(ThemeService);

  /** The theme on screen, with `system` resolved — drives which icon to show. */
  protected readonly isDark = computed(() => this.theme.resolved() === 'dark');

  protected setLanguage(lang: 'en' | 'ar'): void {
    if (lang !== this.language.current()) {
      this.language.setLanguage(lang);
    }
  }
}
