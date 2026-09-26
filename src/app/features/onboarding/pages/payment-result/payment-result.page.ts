import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { isTerminalOperationStatus } from '../../../../enums/domain.enums';
import {
  SubscriptionOperationStatusView,
  SubscriptionPaymentResult,
  isOperationSettling,
} from '../../../../models/subscription.model';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { CheckoutStore } from '../../services/checkout.store';
import { OnboardingCompletion } from '../../services/onboarding-completion.service';
import { OnboardingService } from '../../services/onboarding.service';

/** Every 2s while the backend is fast, then 5s — and never longer than the hard stop. */
const FAST_POLL_MS = 2_000;
const SLOW_POLL_MS = 5_000;
const FAST_POLL_WINDOW_MS = 30_000;
const POLL_DEADLINE_MS = 120_000;

type ResultView =
  | 'loading'
  | 'pending'
  | 'provisioning'
  | 'completed'
  | 'provisioningFailed'
  | 'failed'
  | 'closed'
  | 'unknown';

/**
 * Where a payment lands — one component behind `/onboarding/payment-return`,
 * `-processing`, `-done` and `-failed`.
 *
 * **The route name proves nothing and neither does the query string.** The provider returns the
 * browser with `id`, `status` and `message` on the URL; `status` and `message` are deliberately
 * never read. Only `id` is used, and only as a handle: it is posted to
 * `POST /subscription-operations/{id}/payments/verify`, which makes the BACKEND fetch that
 * payment from the provider server-to-server and decide. Every screen below then renders
 * `GET /subscription-operations/{id}` — so a payer who types the "done" URL by hand sees the
 * real state of their purchase.
 *
 * These routes sit outside `onboardingCompleteGuard` on purpose: a verified payment flips the
 * tenant to active, and that guard would otherwise bounce the payer away from their own result.
 */
@Component({
  selector: 'app-payment-result-page',
  imports: [TranslatePipe, AuthLayout],
  host: { class: 'auth-page-host' },
  template: `
    <app-auth-layout>
      <header class="auth-form__head">
        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'onboarding.result.' + view() + '.title' | translate }}
        </h1>
        <p class="auth-form__lead">{{ 'onboarding.result.' + view() + '.body' | translate }}</p>
      </header>

      @switch (view()) {
        @case ('loading') {
          <p class="auth-form__info auth-form__info--inline" role="status" aria-live="polite">
            <span class="auth-form__spinner" aria-hidden="true"></span>
            {{ 'onboarding.result.checking' | translate }}
          </p>
        }
        @case ('pending') {
          <p class="auth-form__info auth-form__info--inline" role="status" aria-live="polite">
            {{ 'onboarding.result.doNotClose' | translate }}
          </p>
          <button
            class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            [disabled]="busy()"
            (click)="refresh()"
          >
            {{ 'onboarding.result.checkAgain' | translate }}
          </button>
        }
        @case ('provisioning') {
          <p class="auth-form__info auth-form__info--inline" role="status" aria-live="polite">
            {{ 'onboarding.result.doNotClose' | translate }}
          </p>
          <button
            class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            [disabled]="busy()"
            (click)="refresh()"
          >
            {{ 'onboarding.result.checkAgain' | translate }}
          </button>
        }
        @case ('completed') {
          <div class="auth-success" role="status">
            <div class="auth-success__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="m9 12 2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <p class="auth-success__message">{{ 'onboarding.result.reauthNote' | translate }}</p>
          </div>
          <button
            class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            (click)="finish()"
          >
            {{ 'onboarding.result.continueToSignIn' | translate }}
          </button>
        }
        @case ('provisioningFailed') {
          <button
            class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            [disabled]="busy()"
            (click)="resumeSetup()"
          >
            {{ 'onboarding.result.resumeSetup' | translate }}
          </button>
        }
        @case ('failed') {
          @if (canRetryPayment()) {
            <button
              class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              [disabled]="busy()"
              (click)="retryPayment()"
            >
              {{ 'onboarding.result.tryAnotherCard' | translate }}
            </button>
          } @else {
            <p class="auth-form__info auth-form__info--inline">
              {{ 'onboarding.result.notRetryable' | translate }}
            </p>
          }
          <p class="auth-form__register">
            <button class="auth-form__link" type="button" (click)="startAgain()">
              {{ 'onboarding.result.backToPackages' | translate }}
            </button>
          </p>
        }
        @default {
          <button
            class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            (click)="startAgain()"
          >
            {{ 'onboarding.result.startAgain' | translate }}
          </button>
        }
      }
    </app-auth-layout>
  `,
})
export class PaymentResultPage {
  private readonly onboardingService = inject(OnboardingService);
  private readonly completion = inject(OnboardingCompletion);
  private readonly checkout = inject(CheckoutStore);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The backend put the operation id on the callback URL it gave the provider; the breadcrumb
   * is the fallback for a provider that drops query parameters. It is only a handle — the
   * backend re-validates it against the session on every call.
   */
  private readonly operationId =
    this.route.snapshot.queryParamMap.get('operationId') ?? this.checkout.operationId();

  /**
   * The provider payment the payer returned from. `status` and `message` sit next to it on the
   * query string and are never read: they are payer-editable and prove nothing.
   */
  private readonly providerPaymentId = this.route.snapshot.queryParamMap.get('id');

  private readonly status = signal<SubscriptionOperationStatusView | null>(null);

  /**
   * The verdict verification returned, kept separately from the polled status.
   *
   * It carries `requiresReauthentication` and `completionUrl`, which the status view does not,
   * and it survives as the newest backend-verified answer if a later status read cannot be
   * made. Both are backend-verified; neither is the browser's opinion.
   */
  private readonly verified = signal<SubscriptionPaymentResult | null>(null);

  protected readonly busy = signal(false);
  private readonly loaded = signal(false);

  private readonly startedAt = Date.now();
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly view = computed<ResultView>(() => {
    // The freshest backend answer wins: a polled status when there is one, else the
    // verification verdict, which is equally backend-verified.
    const outcome = this.status()?.status ?? this.verified()?.status ?? null;

    if (!this.loaded()) {
      return 'loading';
    }
    if (outcome === null) {
      return 'unknown';
    }

    switch (outcome) {
      case 'Completed':
        return 'completed';
      case 'ProvisioningFailed':
      case 'ActivationFailed':
        return 'provisioningFailed';
      case 'PaymentConfirmed':
        return 'provisioning';
      case 'PaymentFailed':
        return 'failed';
      case 'Cancelled':
      case 'Expired':
        return 'closed';
      default:
        return 'pending';
    }
  });

  /** Rendered from the server's policy flag, not from this page's reading of the status. */
  protected readonly canRetryPayment = computed(
    () => this.status()?.canRetryPayment ?? this.verified()?.canRetryPayment ?? false,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());

    if (this.operationId === null) {
      this.loaded.set(true);
      return;
    }

    // The presence of a provider payment id — not the route name — marks this as the return leg.
    if (this.providerPaymentId !== null) {
      this.verify(this.operationId, this.providerPaymentId);
      return;
    }
    this.refresh();
  }

  /**
   * The return leg. It asks the BACKEND to fetch the payment from the provider; the query
   * string is only a handle. On any failure it falls back to reading the operation status, so a
   * payment the webhook already settled still resolves correctly — a verification failure is
   * never rendered as a verdict.
   */
  private verify(operationId: string, providerPaymentId: string): void {
    this.busy.set(true);
    this.onboardingService
      .verifyPayment(operationId, providerPaymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.verified.set(result);
          this.loaded.set(true);
          this.markCompleteIfDone(result.status);

          // A terminal verdict needs no follow-up read, and the URL still carries the provider
          // parameters — scrub them so a refresh does not re-verify a spent callback.
          this.scrubProviderParams(operationId);
          if (!isTerminalOperationStatus(result.status)) {
            this.refresh();
          }
        },
        error: () => {
          this.busy.set(false);
          this.scrubProviderParams(operationId);
          this.refresh();
        },
      });
  }

  protected refresh(): void {
    const operationId = this.operationId;
    if (operationId === null || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.onboardingService
      .loadOperation(operationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.busy.set(false);
          this.loaded.set(true);
          this.status.set(status);
          this.markCompleteIfDone(status.status);
          this.schedulePoll(status);
        },
        // The banner already carries the failure. Whatever was known stays on screen rather
        // than being replaced by "we could not confirm your payment".
        error: () => {
          this.busy.set(false);
          this.loaded.set(true);
        },
      });
  }

  /**
   * Bounded, cancellable polling: fast while the backend is likely to answer, then slower, and
   * a hard stop that hands control back to the payer instead of spinning forever.
   */
  private schedulePoll(status: SubscriptionOperationStatusView): void {
    this.stopPolling();

    if (isTerminalOperationStatus(status.status) || !isOperationSettling(status)) {
      return;
    }

    const elapsed = Date.now() - this.startedAt;
    if (elapsed >= POLL_DEADLINE_MS) {
      return;
    }

    const delay = elapsed < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
    this.timer = setTimeout(() => this.refresh(), delay);
  }

  private stopPolling(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Reopens the purchase for another card and returns the payer to the card form. The next
   * attempt starts with a brand-new token; a consumed one is never reused.
   */
  protected retryPayment(): void {
    const operationId = this.operationId;
    if (operationId === null || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.stopPolling();
    this.onboardingService
      .retryPayment(operationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.checkout.openOperation(result.operationId, result.paymentConfiguration);
          void this.router.navigate(['/onboarding/payment'], {
            queryParams: { operationId: result.operationId },
          });
        },
        error: () => this.busy.set(false),
      });
  }

  /** Paid, but setup did not finish. This never charges again — hence "resume", not "pay". */
  protected resumeSetup(): void {
    const operationId = this.operationId;
    if (operationId === null || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.onboardingService
      .retryProvisioning(operationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.refresh();
        },
        error: () => this.busy.set(false),
      });
  }

  /**
   * Ends the onboarding session. Activation re-provisioned the owner's roles and evicted their
   * permission cache, so the current session predates its own entitlements — the screen says so
   * before this runs.
   *
   * `requiresReauthentication` is read from the verification verdict when there is one. A payer
   * who arrived on this URL without it defaults to re-authenticating: completion always
   * re-provisions roles, and signing in again is the safe answer either way.
   */
  protected finish(): void {
    const verdict = this.verified();
    this.completion.finish({
      requiresReauthentication: verdict?.requiresReauthentication ?? true,
      completionUrl: verdict?.completionUrl ?? null,
    });
  }

  /**
   * Back to the plans. `change=1` marks it as a deliberate return: a failed payment leaves the
   * operation open and payable, and without this the package step would read it and bounce the
   * owner right back here.
   */
  protected startAgain(): void {
    this.checkout.clear();
    void this.router.navigate(['/onboarding/package'], {
      queryParams: { change: '1' },
      replaceUrl: true,
    });
  }

  /** Guards read this before the next /me lands, so Back cannot re-enter the wizard. */
  private markCompleteIfDone(status: string): void {
    if (status === 'Completed') {
      this.session.markOnboardingComplete();
    }
  }

  /**
   * Drops the provider's callback parameters once they have been used. They are single-use
   * handles, and leaving them in history invites a refresh into a pointless re-verification.
   */
  private scrubProviderParams(operationId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { operationId },
      replaceUrl: true,
    });
  }
}
