import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { OnboardedNotice } from '@core/auth/onboarded-notice';
import { SessionStore } from '@core/auth/session.store';
import { BroochError, isTransientError } from '@core/error/error.model';
import { LanguageService } from '@core/i18n/language.service';
import { isTerminalOperationStatus } from '../../../../enums/domain.enums';
import {
  SubscriptionOperationStatusView,
  SubscriptionPaymentResult,
  isOperationSettling,
} from '../../../../models/subscription.model';
import { AuthLayout } from '@shared/ui/auth-layout/auth-layout';
import { BusyOverlay } from '@shared/ui/busy-overlay/busy-overlay';
import { formatDateTime, formatTimeAgo } from '@shared/utils/format-date-time';
import { formatMoney } from '@shared/utils/format-money';
import { CheckoutStore } from '../../services/checkout.store';
import { OnboardingCompletion } from '../../services/onboarding-completion.service';
import { OnboardingService } from '../../services/onboarding.service';
import { PaymentNotice } from '../../ui/payment-notice';
import { PaymentProgress, PaymentProgressStage } from '../../ui/payment-progress';
import { PaymentReceipt } from '../../ui/payment-receipt';
import { PaymentReference } from '../../ui/payment-reference';
import { PaymentEmblemState, PaymentStatusEmblem } from '../../ui/payment-status-emblem';

/** Every 2s while the backend is fast, then 5s — and never longer than the hard stop. */
const FAST_POLL_MS = 2_000;
const SLOW_POLL_MS = 5_000;
const FAST_POLL_WINDOW_MS = 30_000;
const POLL_DEADLINE_MS = 120_000;

/** A read that failed in transit is retried on a doubling backoff, inside the same deadline. */
const RETRY_BASE_MS = 3_000;
const RETRY_MAX_MS = 15_000;

/** Past this, a wait no longer feels instant, so the screen says why it is still waiting. */
const SLOW_NOTICE_MS = 15_000;

/** Returning to the tab re-checks at once — unless the last answer is fresher than this. */
const RECHECK_ON_RETURN_MS = 3_000;

/** How often "last checked 12 seconds ago" and the slow notice re-evaluate. */
const TICK_MS = 1_000;

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
 * What is on screen: the backend's view, refined by whether this page is still watching.
 * A wait that has stopped re-checking says so (`…Stalled`), a purchase with nothing in flight
 * asks for the payment (`awaiting`), and a status that could not be reached is not dressed up
 * as "not found" (`unreachable`).
 */
type ResultScreen =
  | ResultView
  | 'pendingStalled'
  | 'provisioningStalled'
  | 'awaiting'
  | 'unreachable';

/** Which block of actions a screen offers. */
type ResultLayout =
  | 'loading'
  | 'live'
  | 'stalled'
  | 'awaiting'
  | 'completed'
  | 'setupFailed'
  | 'failed'
  | 'unreachable'
  | 'restart';

interface ScreenSpec {
  emblem: PaymentEmblemState;
  progress: PaymentProgressStage | null;
  layout: ResultLayout;
}

const SCREENS: Record<ResultScreen, ScreenSpec> = {
  loading: { emblem: 'verifying', progress: null, layout: 'loading' },
  pending: { emblem: 'verifying', progress: 'verifying', layout: 'live' },
  pendingStalled: { emblem: 'waiting', progress: 'verifyingPaused', layout: 'stalled' },
  awaiting: { emblem: 'idle', progress: null, layout: 'awaiting' },
  provisioning: { emblem: 'building', progress: 'settingUp', layout: 'live' },
  provisioningStalled: { emblem: 'waiting', progress: 'settingUpPaused', layout: 'stalled' },
  completed: { emblem: 'success', progress: null, layout: 'completed' },
  provisioningFailed: { emblem: 'attention', progress: 'setupBlocked', layout: 'setupFailed' },
  failed: { emblem: 'failed', progress: null, layout: 'failed' },
  closed: { emblem: 'closed', progress: null, layout: 'restart' },
  unknown: { emblem: 'unknown', progress: null, layout: 'restart' },
  unreachable: { emblem: 'disconnected', progress: null, layout: 'unreachable' },
};

/** Layouts a fresh read could still change — re-checked when the payer comes back. */
const OPEN_LAYOUTS: ReadonlySet<ResultLayout> = new Set([
  'loading',
  'live',
  'stalled',
  'awaiting',
  'unreachable',
]);

/** Statuses a paid purchase passes through before the backend completes it on its own. */
const PAID_IN_FLIGHT: ReadonlySet<string> = new Set(['PendingPayment', 'PaymentConfirmed']);

/**
 * Whether the backend still has work to do without the payer. `isOperationSettling` covers a
 * payment being decided and provisioning that reports `Running`; a payment already `Paid` on a
 * purchase that has not completed is moving too — the webhook or the provisioning job has yet
 * to land. Without this, a successful payment caught in that gap stopped the watch before the
 * success screen could arrive. Still read off the response, never off elapsed time.
 */
function isStillMoving(status: SubscriptionOperationStatusView): boolean {
  return (
    isOperationSettling(status) ||
    (status.paymentState === 'Paid' && PAID_IN_FLIGHT.has(status.status))
  );
}

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
 * **A slow answer is never a dead end.** Polling is bounded; when it stops, the screen says the
 * wait has stalled and hands the next check to the payer. A read lost in transit is retried
 * quietly, going offline pauses the watch until the connection returns, and coming back to the
 * tab checks again at once.
 *
 * These routes sit outside `onboardingCompleteGuard` on purpose: a verified payment flips the
 * tenant to active, and that guard would otherwise bounce the payer away from their own result.
 */
@Component({
  selector: 'app-payment-result-page',
  imports: [
    TranslatePipe,
    AuthLayout,
    BusyOverlay,
    PaymentNotice,
    PaymentProgress,
    PaymentReceipt,
    PaymentReference,
    PaymentStatusEmblem,
  ],
  host: {
    class: 'auth-page-host',
    '(window:online)': 'goOnline()',
    '(window:offline)': 'online.set(false)',
    '(document:visibilitychange)': 'recheckOnReturn()',
  },
  styles: `
    .rise {
      animation: rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
      animation-delay: calc(0.18s + var(--step, 0) * 0.08s);
    }
    @keyframes rise { from { opacity: 0; translate: 0 10px; } }
  `,
  template: `
    <app-auth-layout>
      <!-- Outside the keyed block below, so it survives each swap and announces the new state. -->
      <p class="sr-only" aria-live="polite" aria-atomic="true">
        {{ 'onboarding.result.' + screen() + '.title' | translate }}
      </p>

      <!-- Keyed on the screen: a new state rebuilds the block, so it enters with its own motion
           instead of swapping text in place. -->
      @for (current of [screen()]; track current) {
        <div class="flex flex-col items-center text-center">
          <app-payment-status-emblem class="mb-6" [state]="spec().emblem" />

          <header class="rise mb-5" style="--step: 0">
            <h1 #heading class="auth-form__title" id="main-content-header" tabindex="-1">
              {{ 'onboarding.result.' + current + '.title' | translate }}
            </h1>
            <p class="auth-form__lead mx-auto max-w-[38ch]">
              {{ 'onboarding.result.' + current + '.body' | translate }}
            </p>
          </header>

          @if (spec().progress; as stage) {
            <div
              class="rise mb-4 w-full rounded-[12px] border border-border-button bg-surface-muted px-4 py-3.5"
              style="--step: 1"
            >
              <app-payment-progress [stage]="stage" />
            </div>
          }

          <div class="grid w-full justify-items-center gap-3 text-[13px]">
            @if (!online() && open()) {
              <app-payment-notice class="rise" tone="warning" icon="offline" role="status">
                {{ 'onboarding.result.offline' | translate }}
              </app-payment-notice>
            }

            @switch (spec().layout) {
              @case ('loading') {
                @if (slow()) {
                  <app-payment-notice class="rise" icon="clock" role="status">
                    {{ 'onboarding.result.slow.loading' | translate }}
                  </app-payment-notice>
                }
              }

              @case ('live') {
                <!-- Offline, nothing is being checked; the offline notice above says what happens next. -->
                @if (online()) {
                  <p
                    class="rise m-0 inline-flex items-center gap-2 text-[12px] text-text-muted"
                    style="--step: 2"
                  >
                    <span class="relative inline-flex size-2" aria-hidden="true">
                      <span class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60"></span>
                      <span class="relative inline-flex size-2 rounded-full bg-success"></span>
                    </span>
                    <span>
                      {{ 'onboarding.result.autoChecking' | translate }}
                      @if (checkedAgo(); as ago) {
                        · {{ 'onboarding.result.lastChecked' | translate: { time: ago } }}
                      }
                    </span>
                  </p>
                }
                @if (slow()) {
                  <app-payment-notice class="rise" icon="clock" role="status">
                    {{ 'onboarding.result.slow.' + current | translate }}
                    <button
                      type="button"
                      class="auth-form__link mt-1 block"
                      [disabled]="manualCheck()"
                      (click)="checkAgain()"
                    >
                      {{ 'onboarding.result.checkNow' | translate }}
                    </button>
                  </app-payment-notice>
                }
              }

              @case ('stalled') {
                <app-payment-notice class="rise" icon="shield" style="--step: 2">
                  {{ 'onboarding.result.safeToLeave' | translate }}
                </app-payment-notice>
                <button
                  class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style="--step: 3"
                  type="button"
                  [disabled]="manualCheck()"
                  [attr.aria-busy]="manualCheck()"
                  (click)="checkAgain()"
                >
                  <span class="auth-form__submit-inner">
                    @if (manualCheck()) {
                      <span class="auth-form__spinner" aria-hidden="true"></span>
                      {{ 'onboarding.result.checking' | translate }}
                    } @else {
                      {{ 'onboarding.result.checkAgain' | translate }}
                    }
                  </span>
                </button>
                @if (checkedAgo(); as ago) {
                  <p class="rise m-0 text-[12px] text-text-muted" style="--step: 4">
                    {{ 'onboarding.result.lastChecked' | translate: { time: ago } }}
                  </p>
                }
              }

              @case ('awaiting') {
                <button
                  class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style="--step: 2"
                  type="button"
                  (click)="returnToPayment()"
                >
                  {{ 'onboarding.result.returnToPayment' | translate }}
                </button>
                <button
                  class="rise auth-form__link text-[13px]"
                  style="--step: 3"
                  type="button"
                  [disabled]="manualCheck()"
                  [attr.aria-busy]="manualCheck()"
                  (click)="checkAgain()"
                >
                  {{
                    (manualCheck() ? 'onboarding.result.checking' : 'onboarding.result.checkAgain')
                      | translate
                  }}
                </button>
              }

              @case ('completed') {
                @if (operationId; as id) {
                  <app-payment-receipt
                    class="w-full"
                    [amount]="amountLabel()"
                    [paidWith]="cardLabel()"
                    [paidOn]="paidOnLabel()"
                    [reference]="id"
                  />
                }
                @if (reauthRequired()) {
                  <p
                    class="rise m-0 flex items-start gap-2 text-start text-[12.5px] leading-relaxed text-text-muted"
                    style="--step: 4"
                  >
                    <svg class="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5M12 7.7h.01" />
                    </svg>
                    {{ 'onboarding.result.reauthNote' | translate }}
                  </p>
                }
                <button
                  class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style="--step: 5"
                  type="button"
                  [disabled]="finishing()"
                  (click)="finish()"
                >
                  {{
                    (reauthRequired()
                      ? 'onboarding.result.continueToSignIn'
                      : 'onboarding.result.openWorkspace'
                    ) | translate
                  }}
                  <svg class="size-4 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              }

              @case ('setupFailed') {
                <button
                  class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style="--step: 2"
                  type="button"
                  [disabled]="busy()"
                  [attr.aria-busy]="busy()"
                  (click)="resumeSetup()"
                >
                  <span class="auth-form__submit-inner">
                    @if (busy()) {
                      <span class="auth-form__spinner" aria-hidden="true"></span>
                    }
                    {{ 'onboarding.result.resumeSetup' | translate }}
                  </span>
                </button>
              }

              @case ('failed') {
                @if (failureReason(); as reason) {
                  <app-payment-notice class="rise" tone="danger" icon="alert" style="--step: 1">
                    {{ reason }}
                  </app-payment-notice>
                }
                <p class="rise m-0 max-w-[40ch] text-[12.5px] leading-relaxed text-text-muted" style="--step: 2">
                  {{ 'onboarding.result.failedTips' | translate }}
                </p>
                @if (canRetryPayment()) {
                  <button
                    class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                    style="--step: 3"
                    type="button"
                    [disabled]="busy()"
                    [attr.aria-busy]="busy()"
                    (click)="retryPayment()"
                  >
                    <span class="auth-form__submit-inner">
                      @if (busy()) {
                        <span class="auth-form__spinner" aria-hidden="true"></span>
                      }
                      {{ 'onboarding.result.tryAgain' | translate }}
                    </span>
                  </button>
                  <button class="rise auth-form__link text-[13px]" style="--step: 4" type="button" (click)="startAgain()">
                    {{ 'onboarding.result.backToPackages' | translate }}
                  </button>
                } @else {
                  <app-payment-notice class="rise" icon="alert" style="--step: 3">
                    {{ 'onboarding.result.notRetryable' | translate }}
                  </app-payment-notice>
                  <button
                    class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                    style="--step: 4"
                    type="button"
                    (click)="startAgain()"
                  >
                    {{ 'onboarding.result.backToPackages' | translate }}
                  </button>
                }
              }

              @case ('unreachable') {
                <button
                  class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style="--step: 2"
                  type="button"
                  [disabled]="manualCheck()"
                  [attr.aria-busy]="manualCheck()"
                  (click)="checkAgain()"
                >
                  <span class="auth-form__submit-inner">
                    @if (manualCheck()) {
                      <span class="auth-form__spinner" aria-hidden="true"></span>
                      {{ 'onboarding.result.checking' | translate }}
                    } @else {
                      {{ 'onboarding.result.checkAgain' | translate }}
                    }
                  </span>
                </button>
              }

              @case ('restart') {
                <button
                  class="rise btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style="--step: 2"
                  type="button"
                  (click)="startAgain()"
                >
                  {{ 'onboarding.result.startAgain' | translate }}
                </button>
              }
            }

            @if (showsReference()) {
              @if (operationId; as id) {
                <p
                  class="rise m-0 mt-1 inline-flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-text-muted"
                  style="--step: 6"
                >
                  {{ 'onboarding.result.reference.support' | translate }}
                  <app-payment-reference [value]="id" />
                </p>
              }
            }

            @if (spec().layout === 'failed') {
              <p class="rise m-0 max-w-[44ch] text-[11.5px] leading-relaxed text-text-muted" style="--step: 7">
                {{ 'onboarding.result.holdNote' | translate }}
              </p>
            }
          </div>
        </div>
      }
    </app-auth-layout>

    @if (finishing()) {
      <app-busy-overlay
        [messageKey]="reauthRequired() ? 'onboarding.result.finishing.signIn' : 'onboarding.result.finishing.workspace'"
      />
    }
  `,
})
export class PaymentResultPage {
  private readonly onboardingService = inject(OnboardingService);
  private readonly completion = inject(OnboardingCompletion);
  private readonly checkout = inject(CheckoutStore);
  private readonly session = inject(SessionStore);
  private readonly onboardedNotice = inject(OnboardedNotice);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  /**
   * The backend put the operation id on the callback URL it gave the provider; the breadcrumb
   * is the fallback for a provider that drops query parameters. It is only a handle — the
   * backend re-validates it against the session on every call.
   */
  protected readonly operationId =
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
   * It carries `requiresReauthentication`, `completionUrl` and the card used, which the status
   * view does not, and it survives as the newest backend-verified answer if a later status read
   * cannot be made. Both are backend-verified; neither is the browser's opinion.
   */
  private readonly verified = signal<SubscriptionPaymentResult | null>(null);

  private readonly loaded = signal(false);
  /** Every read failed in transit before any answer arrived — not the same as "not found". */
  private readonly unreachable = signal(false);

  /** A verification or status read is on the wire — background polls included. */
  private readonly reading = signal(false);
  /** The payer asked for this read: the one kind of read that shows on a button. */
  protected readonly manualCheck = signal(false);
  /** A payer action — reopening the payment, resuming setup — is on the wire. */
  protected readonly busy = signal(false);
  protected readonly finishing = signal(false);

  /**
   * `paused` once the page has stopped re-checking on its own — the deadline passed, the
   * backend reports nothing in flight, or a read failed for good. The screen then hands the
   * next check to the payer instead of animating a wait that is no longer being watched.
   */
  private readonly watch = signal<'live' | 'paused'>('live');
  /** When the current wait began. Asking again starts a fresh window with a fresh deadline. */
  private readonly waitStartedAt = signal(Date.now());
  private readonly lastCheckedAt = signal<number | null>(null);
  private readonly now = signal(Date.now());
  protected readonly online = signal(navigator.onLine);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  /** The freshest backend answer: a polled status when there is one, else the verdict. */
  private readonly outcome = computed(
    () => this.status()?.status ?? this.verified()?.status ?? null,
  );

  /** Whether the backend reports work in flight — the only thing that keeps the page polling. */
  private readonly settling = computed(() => {
    const status = this.status();
    if (status !== null) {
      return isStillMoving(status);
    }
    const verdict = this.verified();
    return (
      verdict?.paymentState === 'Processing' ||
      (verdict?.paymentState === 'Paid' && PAID_IN_FLIGHT.has(verdict.status))
    );
  });

  private readonly view = computed<ResultView>(() => {
    if (!this.loaded()) {
      return 'loading';
    }

    switch (this.outcome()) {
      case null:
        return 'unknown';
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

  protected readonly screen = computed<ResultScreen>(() => {
    const view = this.view();
    const paused = this.watch() === 'paused';

    if (view === 'unknown' && this.unreachable()) {
      return 'unreachable';
    }
    if (view === 'pending') {
      // Nothing in flight on an unpaid purchase: there is a payment to finish, not a wait.
      if (this.outcome() === 'PendingPayment' && !this.settling()) {
        return 'awaiting';
      }
      return paused ? 'pendingStalled' : 'pending';
    }
    if (view === 'provisioning' && paused) {
      return 'provisioningStalled';
    }
    return view;
  });

  protected readonly spec = computed(() => SCREENS[this.screen()]);
  protected readonly open = computed(() => OPEN_LAYOUTS.has(this.spec().layout));

  /** The wait has outlasted "instant" while the page is still actively checking. */
  protected readonly slow = computed(() => {
    const layout = this.spec().layout;
    return (
      (layout === 'loading' || layout === 'live') &&
      this.now() - this.waitStartedAt() >= SLOW_NOTICE_MS
    );
  });

  /** Screens where the payer may end up talking to support. */
  protected readonly showsReference = computed(() => {
    const layout = this.spec().layout;
    return (
      layout === 'stalled' ||
      layout === 'setupFailed' ||
      layout === 'failed' ||
      layout === 'unreachable'
    );
  });

  /** Rendered from the server's policy flag, not from this page's reading of the status. */
  protected readonly canRetryPayment = computed(
    () => this.status()?.canRetryPayment ?? this.verified()?.canRetryPayment ?? false,
  );

  /**
   * Activation re-provisions roles, so signing in again is the safe default when no verdict
   * says otherwise — see `finish()`.
   */
  protected readonly reauthRequired = computed(
    () => this.verified()?.requiresReauthentication ?? true,
  );

  /** The server-priced amount, display only. */
  protected readonly amountLabel = computed(() => {
    const source = this.status() ?? this.verified();
    return source ? formatMoney(source.amount, source.currency, this.language.current()) : '';
  });

  /** Only a 3DS return carries the card; a payer who arrived otherwise simply sees no card row. */
  protected readonly cardLabel = computed(() => {
    const verdict = this.verified();
    if (!verdict?.cardLastFour) {
      return null;
    }
    return `${(verdict.cardBrand ?? '').toUpperCase()} •••• ${verdict.cardLastFour}`.trim();
  });

  protected readonly paidOnLabel = computed(() =>
    formatDateTime(this.status()?.completedAt, this.language.current()),
  );

  /**
   * Human copy for a known decline code. Codes come off the wire, so an unmapped one degrades
   * to no reason line rather than to a raw key.
   */
  protected readonly failureReason = computed(() => {
    const code = this.status()?.failureCode ?? this.verified()?.failureCode;
    return code ? this.language.labelOr(`onboarding.result.failureReasons.${code}`, '') || null : null;
  });

  protected readonly checkedAgo = computed(() => {
    const at = this.lastCheckedAt();
    if (at === null) {
      return null;
    }
    const language = this.language.current();
    return (
      formatTimeAgo(at, this.now(), language) ??
      this.language.labelOr('onboarding.result.justNow', 'just now')
    );
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());

    const ticker = setInterval(() => this.now.set(Date.now()), TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(ticker));

    this.keepFocusAcrossScreens();

    if (this.operationId === null) {
      this.loaded.set(true);
      return;
    }

    // The presence of a provider payment id — not the route name — marks this as the return leg.
    if (this.providerPaymentId !== null) {
      this.verify(this.operationId, this.providerPaymentId);
      return;
    }
    this.read('foreground');
  }

  /**
   * The return leg. It asks the BACKEND to fetch the payment from the provider; the query
   * string is only a handle. On any failure it falls back to reading the operation status, so a
   * payment the webhook already settled still resolves correctly — a verification failure is
   * never rendered as a verdict.
   */
  private verify(operationId: string, providerPaymentId: string): void {
    this.reading.set(true);
    this.onboardingService
      .verifyPayment(operationId, providerPaymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.reading.set(false);
          this.verified.set(result);
          this.lastCheckedAt.set(Date.now());
          this.loaded.set(true);
          this.markCompleteIfDone(result.status);

          // A terminal verdict needs no follow-up read, and the URL still carries the provider
          // parameters — scrub them so a refresh does not re-verify a spent callback.
          this.scrubProviderParams(operationId);
          if (!isTerminalOperationStatus(result.status)) {
            this.read('foreground');
          }
        },
        error: () => {
          this.reading.set(false);
          this.scrubProviderParams(operationId);
          this.read('foreground');
        },
      });
  }

  /**
   * Reads `GET /subscription-operations/{id}`. A `background` read is a poll the payer did not
   * ask for: it stays off the loading bar and the error banner. The first read and any the
   * payer asks for are `foreground`, so a refusal still surfaces on the banner.
   */
  private read(mode: 'foreground' | 'background'): void {
    const operationId = this.operationId;
    if (operationId === null || this.reading()) {
      return;
    }

    this.stopPolling();
    this.reading.set(true);
    this.onboardingService
      .loadOperation(operationId, { background: mode === 'background' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.reading.set(false);
          this.manualCheck.set(false);
          this.failures = 0;
          this.unreachable.set(false);
          this.lastCheckedAt.set(Date.now());
          this.status.set(status);
          this.loaded.set(true);
          this.markCompleteIfDone(status.status);
          this.schedulePoll(status);
        },
        error: (failure: BroochError) => {
          this.reading.set(false);
          this.manualCheck.set(false);
          // While a retry is on its way, whatever was known stays on screen — a failed read is
          // never rendered as "we could not confirm your payment".
          if (!this.scheduleRetry(failure)) {
            this.unreachable.set(this.outcome() === null && isTransientError(failure));
            this.loaded.set(true);
          }
        },
      });
  }

  /**
   * Bounded, cancellable polling: fast while the backend is likely to answer, then slower, and
   * a hard stop that hands control back to the payer instead of spinning forever.
   */
  private schedulePoll(status: SubscriptionOperationStatusView): void {
    this.stopPolling();

    const elapsed = Date.now() - this.waitStartedAt();
    if (
      isTerminalOperationStatus(status.status) ||
      !isStillMoving(status) ||
      elapsed >= POLL_DEADLINE_MS
    ) {
      this.watch.set('paused');
      return;
    }

    this.watch.set('live');
    const delay = elapsed < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
    this.timer = setTimeout(() => this.readIfOnline(), delay);
  }

  /**
   * A read that failed is not a verdict. While the purchase could still be moving — or nothing
   * is known yet — a failure in transit is retried on a backoff inside the polling deadline.
   * A refusal (404, 403…) is an answer and is left to the banner. Returns whether a retry is on
   * its way.
   */
  private scheduleRetry(failure: BroochError): boolean {
    this.stopPolling();

    const outcome = this.outcome();
    const stillMoving =
      outcome === null || (!isTerminalOperationStatus(outcome) && this.settling());
    const elapsed = Date.now() - this.waitStartedAt();

    if (!isTransientError(failure) || !stillMoving || elapsed >= POLL_DEADLINE_MS) {
      this.watch.set('paused');
      return false;
    }

    this.watch.set('live');
    if (!this.online()) {
      return true;
    }
    this.failures += 1;
    const delay = Math.min(RETRY_BASE_MS * 2 ** (this.failures - 1), RETRY_MAX_MS);
    this.timer = setTimeout(() => this.readIfOnline(), delay);
    return true;
  }

  private stopPolling(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Offline, a read can only fail — the `online` event resumes the watch instead. */
  private readIfOnline(): void {
    if (this.online()) {
      this.read('background');
    }
  }

  /**
   * The payer asked. A stalled wait gets a fresh window, so a "yes, still going" polls again.
   * A poll already on the wire answers the ask; firing a second read would only race it.
   */
  protected checkAgain(): void {
    if (this.manualCheck()) {
      return;
    }
    this.restartWindowIfPaused();
    this.failures = 0;
    this.manualCheck.set(true);
    if (!this.reading()) {
      this.read('foreground');
    }
  }

  protected goOnline(): void {
    this.online.set(true);
    if (this.open()) {
      this.resumeWatching();
    }
  }

  /** Coming back to the tab is a good moment to look again — unless the answer is fresh. */
  protected recheckOnReturn(): void {
    if (this.document.visibilityState !== 'visible' || !this.open()) {
      return;
    }
    const last = this.lastCheckedAt();
    if (last !== null && Date.now() - last < RECHECK_ON_RETURN_MS) {
      return;
    }
    this.resumeWatching();
  }

  private resumeWatching(): void {
    this.restartWindowIfPaused();
    this.failures = 0;
    this.read('background');
  }

  private restartWindowIfPaused(): void {
    if (this.watch() === 'paused') {
      this.waitStartedAt.set(Date.now());
    }
  }

  /**
   * Reopens the purchase for another attempt and returns the payer to the card form. The next
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
          // Setup starts over, so it gets a full polling window of its own.
          this.waitStartedAt.set(Date.now());
          this.read('foreground');
        },
        error: () => this.busy.set(false),
      });
  }

  /**
   * Back to the card step for a purchase with nothing in flight. The payment page re-reads the
   * operation and offers only what the server allows — a card form, a reopen, or neither.
   */
  protected returnToPayment(): void {
    const operationId = this.operationId;
    if (operationId === null) {
      return;
    }
    void this.router.navigate(['/onboarding/payment'], { queryParams: { operationId } });
  }

  /**
   * Ends the onboarding session. Activation re-provisioned the owner's roles and evicted their
   * permission cache, so the current session predates its own entitlements — the screen says so
   * before this runs. The overlay stays up: either way this ends in a navigation.
   *
   * `requiresReauthentication` is read from the verification verdict when there is one. A payer
   * who arrived on this URL without it defaults to re-authenticating: completion always
   * re-provisions roles, and signing in again is the safe answer either way.
   */
  protected finish(): void {
    if (this.finishing()) {
      return;
    }
    this.finishing.set(true);
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

  /**
   * Guards read this before the next /me lands, so Back cannot re-enter the wizard. The notice
   * makes the login page celebrate the payment even when the stale session is ended by a 401
   * rather than by the "Continue" hand-off.
   */
  private markCompleteIfDone(status: string): void {
    if (status === 'Completed') {
      this.session.markOnboardingComplete();
      this.onboardedNotice.remember();
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

  /**
   * Each new screen is a rebuilt block, so a control that had focus (say, "Check again") is gone
   * once the answer lands. Focus then moves to the new heading rather than falling to the page.
   */
  private keepFocusAcrossScreens(): void {
    let shown: ResultScreen | null = null;
    afterRenderEffect(() => {
      const screen = this.screen();
      if (shown !== null && shown !== screen) {
        const active = this.document.activeElement;
        if (active === null || active === this.document.body) {
          this.heading()?.nativeElement.focus({ preventScroll: true });
        }
      }
      shown = screen;
    });
  }
}
