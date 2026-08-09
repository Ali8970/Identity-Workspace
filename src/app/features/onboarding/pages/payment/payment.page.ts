import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { clientError } from '../../../../core/error/error.model';
import { GlobalErrorService } from '../../../../core/error/global-error.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  CardDetails,
  MoyasarTokenizationService,
  TokenizationFailureReason,
  tokenizationFailureReason,
} from '../../../../core/payments/moyasar-tokenization.service';
import {
  PaymentAuthenticationNavigator,
  RedirectRejectionReason,
  validateAuthenticationUrl,
} from '../../../../core/payments/payment-redirect';
import {
  SubscriptionOperationStatusView,
  SubscriptionPaymentResult,
} from '../../../../models/subscription.model';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { BusyOverlay } from '../../../../shared/ui/busy-overlay/busy-overlay';
import { formatMoney } from '../../../../shared/utils/format-money';
import { CardFormValue } from '../../models/onboarding-feature.model';
import { CheckoutStore } from '../../services/checkout.store';
import { OnboardingService } from '../../services/onboarding.service';
import { CardForm } from '../../ui/card-form';
import { OnboardingStepper } from '../../ui/onboarding-stepper';

/** How often the payment-window countdown re-renders. */
const COUNTDOWN_TICK_MS = 30_000;

/**
 * The card step of a paid purchase.
 *
 * Three rules shape everything here:
 *
 *  1. **The card never touches a Brooch origin.** It goes straight to the provider's
 *     tokenization endpoint with the publishable key this purchase was issued, and only the
 *     resulting token is sent to Brooch — see `MoyasarTokenizationService`.
 *  2. **Nothing about money is sent.** `POST …/pay` carries the token alone; amount, currency
 *     and package come from the snapshot the backend priced when the operation was created.
 *     The figures on this screen come from `GET /subscription-operations/{id}` and are display
 *     only.
 *  3. **The browser never concludes that a payment succeeded.** The next screen is chosen from
 *     the backend's verified `paymentState`, and a 3DS redirect is an authentication step, not
 *     a result.
 *
 * The operation id lives in the URL, so a refresh resumes the same purchase. The tokenization
 * settings deliberately do not: they are issued per attempt, so a resumed screen asks the
 * server to reopen the purchase (`retry-payment`) rather than replay a stale key.
 */
@Component({
  selector: 'app-payment-page',
  imports: [TranslatePipe, AuthLayout, BusyOverlay, CardForm, OnboardingStepper],
  host: { class: 'auth-page-host' },
  template: `
    <app-auth-layout>
      <header class="auth-form__head">
        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'onboarding.payment.title' | translate }}
        </h1>
        <p class="auth-form__lead">{{ 'onboarding.payment.subtitle' | translate }}</p>
      </header>

      <app-onboarding-stepper current="payment" />

      @if (operation(); as op) {
        <dl class="auth-pay-summary">
          <div class="auth-pay-summary__row">
            <dt>{{ 'onboarding.payment.amountDue' | translate }}</dt>
            <dd class="auth-pay-summary__amount">{{ amountLabel() }}</dd>
          </div>
          @if (expiresInMinutes(); as minutes) {
            <div class="auth-pay-summary__row">
              <dt>{{ 'onboarding.payment.window' | translate }}</dt>
              <dd>{{ 'onboarding.payment.expiresIn' | translate: { minutes } }}</dd>
            </div>
          }
        </dl>

        @switch (view()) {
          @case ('card') {
            <app-card-form
              [amount]="op.amount"
              [currency]="op.currency"
              [busy]="paying()"
              (submitted)="payWithCard($event)"
            />
          }
          @case ('reopen') {
            <p class="auth-form__info auth-form__info--inline" role="status">
              {{ 'onboarding.payment.reopenHint' | translate }}
            </p>
            <button
              class="ui-btn ui-btn--primary auth-form__submit"
              type="button"
              [disabled]="reopening()"
              [attr.aria-busy]="reopening()"
              (click)="reopenPayment()"
            >
              <span class="auth-form__submit-inner">
                @if (reopening()) {
                  <span class="auth-form__spinner" aria-hidden="true"></span>
                  {{ 'onboarding.payment.reopening' | translate }}
                } @else {
                  {{ 'onboarding.payment.reopen' | translate }}
                }
              </span>
            </button>
          }
          @case ('stalled') {
            <p class="auth-form__info auth-form__info--inline" role="status">
              {{ 'onboarding.payment.stalled' | translate }}
            </p>
          }
        }

        <p class="auth-form__register">
          <button class="auth-form__link" type="button" (click)="backToPackages()">
            {{ 'onboarding.payment.backToPackages' | translate }}
          </button>
        </p>
      } @else {
        <p class="auth-form__info auth-form__info--inline" role="status">
          {{ 'onboarding.payment.loading' | translate }}
        </p>
      }
    </app-auth-layout>

    @if (authenticating()) {
      <app-busy-overlay messageKey="onboarding.payment.authenticating" />
    }
  `,
})
export class PaymentPage {
  private readonly onboardingService = inject(OnboardingService);
  private readonly tokenization = inject(MoyasarTokenizationService);
  private readonly authentication = inject(PaymentAuthenticationNavigator);
  private readonly checkout = inject(CheckoutStore);
  private readonly globalErrors = inject(GlobalErrorService);
  private readonly language = inject(LanguageService);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The URL is the primary handle so a refresh resumes the same purchase; the breadcrumb is
   * the fallback for a provider that drops query parameters. Either way the backend
   * re-validates that the operation belongs to the caller's tenant.
   */
  private readonly operationId =
    this.route.snapshot.queryParamMap.get('operationId') ?? this.checkout.operationId();

  protected readonly operation = signal<SubscriptionOperationStatusView | null>(null);
  protected readonly paying = signal(false);
  protected readonly reopening = signal(false);
  protected readonly authenticating = signal(false);

  /** Re-read on entry rather than trusted from the previous screen. */
  private readonly configuration = this.checkout.paymentConfiguration;

  /**
   * A card can only be entered while this attempt's tokenization settings are in hand. Without
   * them the server has to reopen the purchase first — and whether it will is `canRetryPayment`,
   * a server-side policy, never this page's own reasoning about the status.
   */
  protected readonly view = computed<'card' | 'reopen' | 'stalled'>(() => {
    if (this.configuration() !== null) {
      return 'card';
    }
    return this.operation()?.canRetryPayment ? 'reopen' : 'stalled';
  });

  protected readonly amountLabel = computed(() => {
    const op = this.operation();
    return op ? formatMoney(op.amount, op.currency, this.language.current()) : '';
  });

  /** Ticks so the payment window counts down without a timer per binding. */
  private readonly now = signal(Date.now());

  protected readonly expiresInMinutes = computed(() => {
    const expiresAt = this.operation()?.expiresAt;
    if (!expiresAt) {
      return null;
    }
    const remaining = Date.parse(expiresAt) - this.now();
    return remaining > 0 ? Math.ceil(remaining / 60_000) : null;
  });

  constructor() {
    if (this.operationId === null) {
      void this.router.navigate(['/onboarding/package'], { replaceUrl: true });
      return;
    }

    const ticker = setInterval(() => this.now.set(Date.now()), COUNTDOWN_TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(ticker));

    this.loadOperation(this.operationId);
  }

  /**
   * The operation status is the only thing that says whether this screen may take a card. A
   * purchase that is past payment is sent to the result screens instead — never left showing a
   * card form for money that has already moved.
   */
  private loadOperation(operationId: string): void {
    this.onboardingService
      .loadOperation(operationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (operation) => {
          if (operation.status !== 'PendingPayment' && operation.status !== 'PaymentFailed') {
            void this.router.navigate(['/onboarding/payment-processing'], {
              queryParams: { operationId },
              replaceUrl: true,
            });
            return;
          }
          this.operation.set(operation);
        },
        // The banner has the failure; without a status there is nothing to pay against.
        error: () => this.backToPackages(),
      });
  }

  /**
   * Asks the server to reopen the purchase for a fresh attempt, which is the only way to get
   * tokenization settings for a resumed screen. Rendered from `canRetryPayment` when the status
   * says so; a server refusal simply surfaces on the banner.
   */
  protected reopenPayment(): void {
    const operationId = this.operationId;
    if (operationId === null || this.reopening()) {
      return;
    }
    this.reopening.set(true);
    this.onboardingService
      .retryPayment(operationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.reopening.set(false);
          this.checkout.openOperation(result.operationId, result.paymentConfiguration);
          this.loadOperation(result.operationId);
        },
        error: () => this.reopening.set(false),
      });
  }

  /**
   * Tokenizes with the provider, then sends Brooch the token and nothing else.
   *
   * The card value exists only for the duration of the tokenization call: it is never stored,
   * never written to a signal that outlives this method, and never included in a Brooch
   * request. The `paying` guard disables the form so a double submit cannot mint two tokens.
   */
  protected payWithCard(card: CardFormValue): void {
    const configuration = this.configuration();
    const operationId = this.operationId;

    if (configuration === null || operationId === null || this.paying()) {
      return;
    }

    this.paying.set(true);
    this.tokenization
      .tokenize(configuration, card satisfies CardDetails)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tokenized) => this.charge(operationId, tokenized.token),
        error: (failure: unknown) => {
          this.paying.set(false);
          this.showTokenizationFailure(tokenizationFailureReason(failure));
        },
      });
  }

  private charge(operationId: string, token: string): void {
    this.onboardingService
      .payOperation(operationId, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.applyPaymentResult(operationId, result),
        // A charge failure is an HTTP error and already on the banner; re-enable the form.
        error: () => this.paying.set(false),
      });
  }

  /** Acts only on the backend's verified verdict — never on what the form thinks happened. */
  private applyPaymentResult(operationId: string, result: SubscriptionPaymentResult): void {
    if (result.requiresRedirect) {
      this.goToAuthentication(result.redirectUrl);
      return;
    }

    this.paying.set(false);

    if (result.paymentState === 'Paid') {
      void this.router.navigate(['/onboarding/payment-done'], { queryParams: { operationId } });
      return;
    }
    if (result.paymentState === 'Failed') {
      void this.router.navigate(['/onboarding/payment-failed'], { queryParams: { operationId } });
      return;
    }
    // Anything else is the backend still deciding. The processing screen polls it; this one
    // must not guess.
    void this.router.navigate(['/onboarding/payment-processing'], {
      queryParams: { operationId },
    });
  }

  /**
   * The one irreversible step: hand the whole browser to the issuer's 3DS challenge. The URL
   * came from the backend, which validated it against its own allow-list; it is re-checked here
   * so a corrupted response can never turn this into an open redirect.
   */
  private goToAuthentication(redirectUrl: string | null): void {
    const validated = validateAuthenticationUrl(redirectUrl);
    if (!validated.ok) {
      this.paying.set(false);
      this.globalErrors.show(
        clientError('Payment.RedirectRejected', this.redirectRejectionMessage(validated.reason)),
      );
      return;
    }
    this.authenticating.set(true);
    this.authentication.goTo(validated.url);
  }

  /**
   * Back to the plans. `change=1` marks this as a deliberate return so the package step does
   * not read the still-open operation and bounce the owner straight back here — which would
   * make this link a dead end with no escape until the payment window expired.
   */
  protected backToPackages(): void {
    if (this.session.onboardingCompleted()) {
      void this.router.navigate(['/applications'], { replaceUrl: true });
      return;
    }
    void this.router.navigate(['/onboarding/package'], { queryParams: { change: '1' } });
  }

  /**
   * Tokenization bypasses the HTTP pipeline on purpose, so its rejections would otherwise have
   * nowhere to surface. They are published on the one global banner rather than growing a
   * second error UI here. The provider's own message is never shown: it can echo submitted
   * field values, and the copy is fixed anyway.
   */
  private showTokenizationFailure(reason: TokenizationFailureReason): void {
    this.globalErrors.show(
      clientError(
        `Payment.Tokenization.${reason}`,
        this.language.labelOr(
          `onboarding.payment.tokenizationFailed.${reason}`,
          'We could not process those card details. Nothing was charged — please try again.',
        ),
      ),
    );
  }

  private redirectRejectionMessage(reason: RedirectRejectionReason): string {
    return this.language.labelOr(
      `onboarding.payment.redirectRejected.${reason}`,
      'We could not open the card verification step. Nothing was charged — please try again.',
    );
  }
}
