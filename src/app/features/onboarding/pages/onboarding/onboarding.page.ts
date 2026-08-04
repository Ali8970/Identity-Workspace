import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom, of } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { hasSubscription } from '../../../../enums/domain.enums';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { BusyOverlay } from '../../../../shared/ui/busy-overlay/busy-overlay';
import { PackageDto } from '../../models/onboarding-feature.model';
import { OnboardingService } from '../../services/onboarding.service';
import { OnboardingSkeleton } from './onboarding.skeleton';

@Component({
  selector: 'app-onboarding-page',
  imports: [TranslatePipe, FormField, AuthLayout, RouterLink, BusyOverlay, OnboardingSkeleton],
  host: {
    class: 'auth-page-host',
    '[class.auth-page-host--wide]': "step() === 'package'",
    '(window:pageshow)': 'onPageShow($event)',
    '(window:focus)': 'onPageShow($event)',
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
        <app-onboarding-skeleton
          [step]="step()"
          [label]="'onboarding.loading' | translate"
        />
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
                    <span class="auth-package-card__name">{{ language.pick(pkg.nameAr, pkg.nameEn) }}</span>
                    <span class="auth-package-card__desc">
                      {{ language.pick(pkg.descriptionAr ?? '', pkg.descriptionEn ?? '') }}
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
      <app-busy-overlay messageKey="onboarding.redirecting" />
    }
  `,
})
export class OnboardingPage {
  private readonly onboardingService = inject(OnboardingService);
  protected readonly language = inject(LanguageService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly uiDir = computed(() => (this.language.current() === 'ar' ? 'rtl' : 'ltr'));

  protected readonly step = signal<'company' | 'package'>(
    this.router.url.includes('/package') ? 'package' : 'company',
  );
  private readonly tenant = rxResource({
    stream: () => this.onboardingService.loadTenant(),
  });

  /** Only the package step needs the catalogue — the company step must not fetch it. */
  private readonly packageList = rxResource({
    params: () => this.step(),
    stream: ({ params }) =>
      params === 'package' ? this.onboardingService.loadPackages() : of([] as PackageDto[]),
    defaultValue: [] as PackageDto[],
  });

  protected readonly packages = this.packageList.value;
  protected readonly loading = computed(
    () => this.tenant.isLoading() || this.packageList.isLoading(),
  );

  protected readonly busy = signal(false);
  protected readonly redirecting = signal(false);

  /**
   * Seeded from the loaded tenant but user-writable — `linkedSignal` re-seeds if the
   * tenant reloads while leaving edits in place until then.
   */
  protected readonly companyModel = linkedSignal(() => ({
    arabicCompanyName: this.tenant.value()?.companyNameAr ?? '',
    englishCompanyName: this.tenant.value()?.companyNameEn ?? '',
  }));

  /** Defaults to the first package once the catalogue arrives; user choice wins after. */
  protected readonly selectedPackage = linkedSignal<string | null>(
    () => this.packageList.value()[0]?.id ?? null,
  );

  protected readonly companyForm = form(this.companyModel, (schema) => {
    required(schema.arabicCompanyName);
    required(schema.englishCompanyName);
  });

  constructor() {
    // GET /tenant is the authority on whether the package step is already done — it also
    // catches a trial started in another tab. Leaving here covers both wizard steps.
    effect(() => {
      const tenant = this.tenant.value();
      const subscribed =
        tenant?.onboardingCompleted === true || hasSubscription(tenant?.onboardingState);
      if (subscribed) {
        this.leaveWizard();
      }
    });
  }

  /**
   * Reset outbound UI if the browser restores this page (bfcache / Back).
   * A bfcache restore runs no route guard at all, so this is the only place that can stop a
   * subscribed owner from seeing the package list again after Back out of CRM.
   */
  protected onPageShow(event: Event): void {
    this.redirecting.set(false);
    this.busy.set(false);

    if (this.session.onboardingCompleted()) {
      this.leaveWizard();
      return;
    }
    // Restored from bfcache: in-memory state is as stale as the frozen DOM — re-read the tenant
    // and let the effect above decide. `focus` events carry no `persisted` flag and are ignored.
    if ((event as PageTransitionEvent).persisted) {
      this.tenant.reload();
    }
  }

  private leaveWizard(): void {
    this.session.markOnboardingComplete();
    void this.router.navigate(['/applications'], { replaceUrl: true });
  }

  protected selectPackage(packageId: string): void {
    this.selectedPackage.set(packageId);
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
    // One subscription per tenant — never re-post the trial from a restored page.
    if (!packageId || this.busy() || this.session.onboardingCompleted()) {
      return;
    }
    this.busy.set(true);
    this.redirecting.set(true);
    try {
      await firstValueFrom(this.onboardingService.startFreeTrial(packageId));
      // Guards read this before the next /me lands, so Back into the wizard bounces out.
      this.session.markOnboardingComplete();
      // Full reload so the session bootstraps fresh and picks up the now-Active tenant.
      // Land on the workspace, not /login: the session is still valid, so guestGuard
      // would bounce straight past /login and the success banner would never render.
      // `replace`, not `assign`: the package step must not stay on the history stack.
      window.location.replace('/applications?onboarded=1');
    } catch {
      this.busy.set(false);
      this.redirecting.set(false);
    }
  }
}
