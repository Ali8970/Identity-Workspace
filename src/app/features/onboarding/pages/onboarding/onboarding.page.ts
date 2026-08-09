import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom, forkJoin, map, of } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { BroochError, clientError } from '../../../../core/error/error.model';
import { GlobalErrorService } from '../../../../core/error/global-error.service';
import { hasSubscription } from '../../../../enums/domain.enums';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  AvailablePackageView,
  PendingOperationView,
} from '../../../../models/subscription.model';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { BusyOverlay } from '../../../../shared/ui/busy-overlay/busy-overlay';
import { durationLabel } from '../../../../shared/utils/format-duration';
import { OnboardingStep } from '../../models/onboarding-feature.model';
import { CheckoutStore } from '../../services/checkout.store';
import { OnboardingCompletion } from '../../services/onboarding-completion.service';
import { OnboardingService } from '../../services/onboarding.service';
import { OnboardingStepper } from '../../ui/onboarding-stepper';
import { PackageCard } from '../../ui/package-card';
import { OnboardingSkeleton } from './onboarding.skeleton';

/**
 * What the server says about this tenant's purchase, read on entry to the package step.
 * `GET /subscriptions/current` is the authority — never a stored wizard position.
 */
interface PackageStepData {
  packages: AvailablePackageView[];
  subscribed: boolean;
  pending: PendingOperationView | null;
}

/** Nothing to load on the company step; `rxResource` still needs a stream. */
const NO_PACKAGE_STEP: PackageStepData = { packages: [], subscribed: false, pending: null };

/**
 * The first two onboarding steps: company profile, then package choice.
 *
 * The package step reads `GET /subscriptions/available-packages` — the priced, per-tenant
 * catalogue — and its single action is `POST /subscriptions`. That call, and nothing before
 * it, decides whether a card is needed: the response's `requiresPayment` is the authority, not
 * the catalogue row the user clicked and certainly not its price.
 *
 * Paying happens on `/onboarding/payment`; the result screens live on their own routes so a
 * verified payment cannot be bounced away by `onboardingCompleteGuard`.
 */
@Component({
  selector: 'app-onboarding-page',
  imports: [
    TranslatePipe,
    FormField,
    AuthLayout,
    RouterLink,
    BusyOverlay,
    OnboardingSkeleton,
    OnboardingStepper,
    PackageCard,
  ],
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

      <app-onboarding-stepper [current]="step()" />

      @if (loading()) {
        <app-onboarding-skeleton [step]="step()" [label]="'onboarding.loading' | translate" />
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

          @if (pendingOperation(); as pending) {
            <div class="auth-status auth-status--warning" role="status">
              <span class="auth-status__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
              </span>
              <span class="auth-status__body">
                {{ 'onboarding.pending.body' | translate: { package: pendingPackageName() } }}
                <span class="auth-status__hint">
                  {{ 'onboarding.pending.locked' | translate }}
                  @if (pendingExpiry(); as expiry) {
                    {{ expiry.key | translate: expiry.params }}
                  }
                </span>
              </span>
            </div>
          }

          @if (packages().length === 0) {
            <p class="auth-form__info auth-form__info--inline" role="status">
              {{ 'onboarding.noPackages' | translate }}
            </p>
          } @else {
            <div class="auth-package-list" role="radiogroup" aria-labelledby="onboarding-package-heading">
              @for (pkg of packages(); track pkg.packageId) {
                <app-package-card
                  [package]="pkg"
                  [selected]="selectedPackageId() === pkg.packageId"
                  [busy]="busy()"
                  (chosen)="selectPackage($event)"
                />
              }
            </div>

            <p class="auth-form__info auth-form__info--inline">
              {{ checkoutHint() | translate }}
            </p>

            <button
              class="ui-btn ui-btn--primary auth-form__submit"
              type="button"
              [disabled]="!canContinue()"
              [attr.aria-busy]="busy()"
              (click)="continueCheckout()"
            >
              <span class="auth-form__submit-inner">
                @if (busy()) {
                  <span class="auth-form__spinner" aria-hidden="true"></span>
                  {{ 'onboarding.starting' | translate }}
                } @else {
                  {{ continueLabel() | translate }}
                }
              </span>
            </button>
          }

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
  private readonly checkout = inject(CheckoutStore);
  private readonly completion = inject(OnboardingCompletion);
  private readonly globalErrors = inject(GlobalErrorService);
  protected readonly language = inject(LanguageService);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly uiDir = computed(() => (this.language.current() === 'ar' ? 'rtl' : 'ltr'));

  /** From the route's static `data`, so the URL is the only source of the current step. */
  protected readonly step = signal<OnboardingStep>(
    (this.route.snapshot.data['step'] as OnboardingStep) ?? 'company',
  );

  /**
   * `?change=1` — the owner asked to come back and look at the plans again, rather than being
   * dropped here. It suppresses the auto-resume redirect and nothing else; it grants no rights
   * the server would not grant anyway.
   */
  private readonly changingPackage = signal(
    this.route.snapshot.queryParamMap.get('change') === '1',
  );

  private readonly tenant = rxResource({
    stream: () => this.onboardingService.loadTenant(),
  });

  /**
   * The package step needs two answers before it can render: the catalogue, and whether a
   * purchase is already in flight. Reading both together means a resumed journey is detected
   * before the owner can start a second operation, which would only earn a 409.
   */
  private readonly catalogue = rxResource<PackageStepData, OnboardingStep>({
    params: () => this.step(),
    stream: ({ params }) =>
      params === 'package'
        ? forkJoin({
            packages: this.onboardingService.loadPackages(),
            current: this.onboardingService.loadCurrentSubscription(),
          }).pipe(
            map(({ packages, current }) => ({
              packages,
              subscribed: current.hasActiveSubscription,
              pending: current.pendingOperation,
            })),
          )
        : of(NO_PACKAGE_STEP),
    defaultValue: NO_PACKAGE_STEP,
  });

  protected readonly packages = computed(() => this.catalogue.value().packages);

  /**
   * A purchase the server already opened. There is no endpoint to cancel one — the API exposes
   * pay, verify and the two retries, and nothing else — so it stands until `expiresAt`.
   */
  protected readonly pendingOperation = computed(() => this.catalogue.value().pending);

  protected readonly loading = computed(
    () => this.tenant.isLoading() || this.catalogue.isLoading(),
  );

  protected readonly busy = signal(false);
  protected readonly redirecting = signal(false);

  /**
   * Seeded from the loaded tenant but user-writable — `linkedSignal` re-seeds if the tenant
   * reloads while leaving edits in place until then.
   */
  protected readonly companyModel = linkedSignal(() => ({
    arabicCompanyName: this.tenant.value()?.companyNameAr ?? '',
    englishCompanyName: this.tenant.value()?.companyNameEn ?? '',
  }));

  /**
   * Defaults to the first selectable package once the catalogue arrives; user choice wins
   * after. A package the server disabled is never pre-selected.
   */
  protected readonly selectedPackageId = linkedSignal<string | null>(
    () =>
      // An open purchase wins the default: its package is the only one that can be acted on,
      // so pre-selecting anything else would land the owner on a disabled button.
      this.pendingOperation()?.targetPackageId ??
      this.packages().find((pkg) => pkg.isAvailable)?.packageId ??
      null,
  );

  protected readonly selectedPackage = computed(
    () => this.packages().find((pkg) => pkg.packageId === this.selectedPackageId()) ?? null,
  );

  /** True when the chosen package is the one the open purchase was priced for. */
  private readonly selectionMatchesPending = computed(() => {
    const pending = this.pendingOperation();
    return pending !== null && pending.targetPackageId === this.selectedPackageId();
  });

  /**
   * A pending purchase blocks every OTHER package: the API has no way to cancel an operation,
   * and `POST /subscriptions` answers 409 AlreadyPending while one is open. Saying so up front
   * beats letting the owner click into a rejection.
   */
  protected readonly blockedByPending = computed(
    () => this.pendingOperation() !== null && !this.selectionMatchesPending(),
  );

  /**
   * The catalogue's `requiresPayment` is presentation only — it picks the button's wording,
   * never the flow. `POST /subscriptions` decides whether a card is actually needed.
   */
  protected readonly continueLabel = computed(() => {
    if (this.selectionMatchesPending()) {
      return 'onboarding.pending.continuePayment';
    }
    if (this.blockedByPending()) {
      return 'onboarding.pending.blockedAction';
    }
    return this.selectedPackage()?.requiresPayment
      ? 'onboarding.continueToPayment'
      : 'onboarding.activate';
  });

  protected readonly checkoutHint = computed(() => {
    if (this.pendingOperation() !== null) {
      return 'onboarding.pending.hint';
    }
    return this.selectedPackage()?.requiresPayment ? 'onboarding.paidHint' : 'onboarding.freeHint';
  });

  protected readonly canContinue = computed(
    () =>
      !this.busy() &&
      !this.blockedByPending() &&
      (this.selectionMatchesPending() || (this.selectedPackage()?.isAvailable ?? false)),
  );

  /** The open purchase's package, named from the catalogue rather than from a stored label. */
  protected readonly pendingPackageName = computed(() => {
    const pending = this.pendingOperation();
    const pkg = this.packages().find((item) => item.packageId === pending?.targetPackageId);
    return pkg ? this.language.pick(pkg.nameAr, pkg.nameEn) : '';
  });

  /** How long the owner stays locked to this purchase, in units they can read. */
  protected readonly pendingExpiry = computed(() =>
    durationLabel(this.pendingOperation()?.expiresAt, Date.now(), 'onboarding.pending.expiresIn'),
  );

  protected readonly companyForm = form(this.companyModel, (schema) => {
    required(schema.arabicCompanyName);
    required(schema.englishCompanyName);
  });

  constructor() {
    // GET /tenant is the authority on whether the package step is already done — it also
    // catches a subscription activated in another tab.
    effect(() => {
      const tenant = this.tenant.value();
      if (tenant?.onboardingCompleted === true || hasSubscription(tenant?.onboardingState)) {
        this.leaveWizard();
      }
    });

    // Resume, never restart: an operation the server already opened is finished where it left
    // off. Starting a second one only earns 409 SubscriptionOperation.AlreadyPending.
    //
    // The one exception is an owner who deliberately came BACK here from the payment screen.
    // Bouncing them straight out again is a trap: the link would be dead and the only escape
    // would be waiting for the operation to expire. They stay, and the banner explains what is
    // actually possible.
    effect(() => {
      const { subscribed, pending } = this.catalogue.value();

      if (subscribed) {
        this.leaveWizard();
        return;
      }
      if (pending === null || this.changingPackage()) {
        return;
      }

      this.checkout.openOperation(pending.operationId, null);
      void this.router.navigate(
        [pending.isPayable ? '/onboarding/payment' : '/onboarding/payment-processing'],
        { queryParams: { operationId: pending.operationId }, replaceUrl: true },
      );
    });
  }

  /**
   * Reset outbound UI if the browser restores this page (bfcache / Back).
   *
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

  protected selectPackage(pkg: AvailablePackageView): void {
    this.selectedPackageId.set(pkg.packageId);
    this.checkout.selectPackage(pkg.packageId);
  }

  protected saveCompany(event: Event): void {
    event.preventDefault();
    void submit(this.companyForm, async () => {
      this.busy.set(true);
      try {
        await firstValueFrom(this.onboardingService.saveCompanyProfile(this.companyModel()));
        // The new /onboarding/package instance loads the catalogue itself — nothing to fetch here.
        await this.router.navigate(['/onboarding/package']);
      } finally {
        this.busy.set(false);
      }
    });
  }

  /**
   * The one decision point of the whole purchase.
   *
   * The request carries a package id and nothing else — no amount, no currency, no free/paid
   * claim — so a tampered client cannot buy a paid package for nothing. What comes back says
   * which of the two paths this is.
   */
  protected async continueCheckout(): Promise<void> {
    const pkg = this.selectedPackage();
    if (!this.canContinue() || this.session.onboardingCompleted()) {
      return;
    }

    // The purchase already exists for this package — go and pay it, do not open a second one.
    const pending = this.pendingOperation();
    if (pending !== null && this.selectionMatchesPending()) {
      this.checkout.openOperation(pending.operationId, null);
      await this.router.navigate(['/onboarding/payment'], {
        queryParams: { operationId: pending.operationId },
      });
      return;
    }

    if (!pkg) {
      return;
    }

    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.onboardingService.startSubscription(pkg.packageId));
      // Remembered first: from here on a real operation exists server-side, and the 3DS return
      // leg needs its id even if this tab is replaced.
      this.checkout.openOperation(result.operationId, result.paymentConfiguration);

      if (!result.requiresPayment) {
        // Free: the backend has already activated and provisioned everything.
        this.redirecting.set(true);
        this.completion.finish(result);
        return;
      }

      if (result.paymentConfiguration === null) {
        // Payment is required but the browser was given no way to tokenize a card. That is a
        // broken response, not a decline — refuse to improvise, and emphatically do not treat
        // it as a completed free activation.
        this.busy.set(false);
        this.globalErrors.show(
          clientError(
            'Checkout.ConfigurationMissing',
            this.language.labelOr(
              'onboarding.payment.configurationMissing',
              'This package needs a payment, but checkout could not be prepared. Nothing has been charged — please try again.',
            ),
          ),
        );
        return;
      }

      await this.router.navigate(['/onboarding/payment'], {
        queryParams: { operationId: result.operationId },
      });
    } catch (error: unknown) {
      // The banner already showed the failure; these two codes additionally mean "you are
      // looking at the wrong screen", so route rather than leave the owner stuck.
      this.busy.set(false);
      const code = (error as BroochError)?.code;
      if (code === 'SubscriptionApplication.TenantAlreadyHasActiveSubscription') {
        this.leaveWizard();
        return;
      }
      if (code === 'SubscriptionOperation.AlreadyPending') {
        this.catalogue.reload();
      }
    }
  }

  private leaveWizard(): void {
    this.session.markOnboardingComplete();
    this.checkout.clear();
    void this.router.navigate(['/applications'], { replaceUrl: true });
  }
}

