import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { PackageDto } from '../../models/onboarding-feature.model';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-onboarding-page',
  imports: [TranslatePipe, FormField, AuthLayout, RouterLink],
  host: {
    class: 'auth-page-host',
    '[class.auth-page-host--wide]': "step() === 'package'",
    '(window:pageshow)': 'onPageShow()',
    '(window:focus)': 'onPageShow()',
  },
  template: `
    <app-auth-layout>
      <header class="auth-form__head">
        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'onboarding.title' | translate }}
        </h1>
        <p class="auth-form__lead">{{ 'onboarding.subtitle' | translate }}</p>
      </header>

      <nav class="auth-stepper" [attr.aria-label]="'onboarding.stepsLabel' | translate">
        <ol class="auth-stepper__list">
          <li
            class="auth-stepper__item"
            [class.auth-stepper__item--active]="step() === 'company'"
            [class.auth-stepper__item--done]="step() === 'package'"
          >
            <span class="auth-stepper__marker" aria-hidden="true">1</span>
            <span class="auth-stepper__label">{{ 'onboarding.stepCompany' | translate }}</span>
          </li>
          <li class="auth-stepper__divider" aria-hidden="true"></li>
          <li class="auth-stepper__item" [class.auth-stepper__item--active]="step() === 'package'">
            <span class="auth-stepper__marker" aria-hidden="true">2</span>
            <span class="auth-stepper__label">{{ 'onboarding.stepPackage' | translate }}</span>
          </li>
        </ol>
      </nav>

      @if (loading()) {
        <div class="auth-form__loading" role="status" aria-live="polite">
          <span class="auth-overlay__spinner" aria-hidden="true"></span>
          <span>{{ 'onboarding.loading' | translate }}</span>
        </div>
      } @else if (step() === 'company') {
        <form class="auth-form auth-form--register" (submit)="saveCompany($event)" novalidate>
          <section class="auth-form__section" aria-labelledby="onboarding-company-heading">
            <h2 class="auth-form__section-title" id="onboarding-company-heading">
              {{ 'onboarding.companyTitle' | translate }}
            </h2>
            <p class="auth-form__section-lead">{{ 'onboarding.companyHint' | translate }}</p>

            <div class="auth-field">
              <label class="auth-field__label" for="onboarding-ar">
                {{ 'onboarding.arabicName' | translate }}
              </label>
              <div class="auth-field__control">
                <span class="auth-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M4 21V8l8-4 8 4v13" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </span>
                <input
                  id="onboarding-ar"
                  class="auth-field__input"
                  type="text"
                  [attr.dir]="uiDir()"
                  [attr.lang]="language.current()"
                  autocomplete="organization"
                  [placeholder]="'onboarding.arabicNamePlaceholder' | translate"
                  [formField]="companyForm.arabicCompanyName"
                />
              </div>
            </div>

            <div class="auth-field">
              <label class="auth-field__label" for="onboarding-en">
                {{ 'onboarding.englishName' | translate }}
              </label>
              <div class="auth-field__control">
                <span class="auth-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M4 21V8l8-4 8 4v13" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </span>
                <input
                  id="onboarding-en"
                  class="auth-field__input"
                  type="text"
                  [attr.dir]="uiDir()"
                  [attr.lang]="language.current()"
                  autocomplete="organization"
                  [placeholder]="'onboarding.englishNamePlaceholder' | translate"
                  [formField]="companyForm.englishCompanyName"
                />
              </div>
            </div>
          </section>

          <button
            class="ui-btn ui-btn--primary auth-form__submit"
            type="submit"
            [disabled]="busy()"
            [attr.aria-busy]="busy()"
          >
            {{ 'onboarding.continue' | translate }}
          </button>
        </form>
      } @else {
        <section aria-labelledby="onboarding-package-heading">
          <h2 class="auth-form__section-title" id="onboarding-package-heading">
            {{ 'onboarding.packageTitle' | translate }}
          </h2>
          <p class="auth-form__section-lead">{{ 'onboarding.packageHint' | translate }}</p>

          @if (packages().length === 0) {
            <p class="auth-form__info auth-form__info--inline" role="status">
              {{ 'onboarding.noPackages' | translate }}
            </p>
          } @else {
            <div
              class="auth-package-list"
              role="radiogroup"
              [attr.aria-labelledby]="'onboarding-package-heading'"
            >
              @for (pkg of packages(); track pkg.id) {
                <button
                  type="button"
                  class="auth-package-card"
                  role="radio"
                  [attr.aria-checked]="selectedPackage() === pkg.id"
                  [class.auth-package-card--selected]="selectedPackage() === pkg.id"
                  [disabled]="busy()"
                  (click)="selectPackage(pkg.id)"
                >
                  <span class="auth-package-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  </span>
                  <span class="auth-package-card__body">
                    <span class="auth-package-card__name">{{ label(pkg.nameAr, pkg.nameEn) }}</span>
                    <span class="auth-package-card__desc">
                      {{ label(pkg.descriptionAr ?? '', pkg.descriptionEn ?? '') }}
                    </span>
                    <span class="auth-package-card__badge">{{
                      'onboarding.trialBadge' | translate
                    }}</span>
                  </span>
                  <span class="auth-package-card__check" aria-hidden="true">
                    @if (selectedPackage() === pkg.id) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m5 12 5 5L19 7" />
                      </svg>
                    }
                  </span>
                </button>
              }
            </div>
          }

          <p class="auth-form__info auth-form__info--inline">
            {{ 'onboarding.startTrialHint' | translate }}
          </p>

          <button
            class="ui-btn ui-btn--primary auth-form__submit"
            type="button"
            [disabled]="busy() || !selectedPackage()"
            [attr.aria-busy]="busy()"
            (click)="startTrial()"
          >
            {{ 'onboarding.startTrial' | translate }}
          </button>

          <p class="auth-form__register">
            <a class="auth-form__link" routerLink="/onboarding/company">
              {{ 'onboarding.backToCompany' | translate }}
            </a>
          </p>
        </section>
      }
    </app-auth-layout>

    @if (redirecting()) {
      <div class="auth-overlay" role="status" aria-live="polite" aria-busy="true">
        <div class="auth-overlay__panel">
          <span class="auth-overlay__spinner" aria-hidden="true"></span>
          <span>{{ 'onboarding.redirecting' | translate }}</span>
        </div>
      </div>
    }
  `,
})
export class OnboardingPage {
  private readonly onboardingService = inject(OnboardingService);
  protected readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly uiDir = computed(() => (this.language.current() === 'ar' ? 'rtl' : 'ltr'));

  protected readonly step = signal<'company' | 'package'>(
    inject(Router).url.includes('/package') ? 'package' : 'company',
  );
  protected readonly packages = signal<PackageDto[]>([]);
  protected readonly selectedPackage = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly redirecting = signal(false);
  protected readonly companyModel = signal({ arabicCompanyName: '', englishCompanyName: '' });
  protected readonly companyForm = form(this.companyModel, (schema) => {
    required(schema.arabicCompanyName);
    required(schema.englishCompanyName);
  });

  constructor() {
    void this.bootstrap();
  }

  /** Reset outbound UI if the browser restores this page (bfcache / Back). */
  protected onPageShow(): void {
    this.redirecting.set(false);
    this.busy.set(false);
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected selectPackage(packageId: string): void {
    this.selectedPackage.set(packageId);
  }

  private async bootstrap(): Promise<void> {
    this.loading.set(true);
    try {
      const tenant = await firstValueFrom(this.onboardingService.loadTenant());
      this.companyModel.set({
        arabicCompanyName: tenant.companyNameAr ?? '',
        englishCompanyName: tenant.companyNameEn ?? '',
      });
      if (this.step() === 'package') {
        const packages = await firstValueFrom(this.onboardingService.loadPackages());
        this.packages.set(packages);
        this.selectedPackage.set(packages[0]?.id ?? null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected saveCompany(event: Event): void {
    event.preventDefault();
    void submit(this.companyForm, async () => {
      this.busy.set(true);
      try {
        const value = this.companyModel();
        await firstValueFrom(this.onboardingService.saveCompanyProfile(value));
        // New /onboarding/package instance loads packages in bootstrap — avoid a second call here.
        await this.router.navigate(['/onboarding/package']);
      } finally {
        this.busy.set(false);
      }
    });
  }

  protected async startTrial(): Promise<void> {
    const packageId = this.selectedPackage();
    if (!packageId) {
      return;
    }
    this.busy.set(true);
    this.redirecting.set(true);
    try {
      await firstValueFrom(this.onboardingService.startFreeTrial(packageId));
      window.location.assign('/login?onboarded=1');
    } catch {
      this.busy.set(false);
      this.redirecting.set(false);
    }
  }
}
