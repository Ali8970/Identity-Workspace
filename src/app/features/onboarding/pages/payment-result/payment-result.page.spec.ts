import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { BroochError } from '@core/error/error.model';
import { SubscriptionOperationStatusView, SubscriptionPaymentResult } from '../../models/subscription.model';
import { OnboardingCompletion } from '../../services/onboarding-completion.service';
import { OnboardingService } from '../../services/onboarding.service';
import { PaymentResultPage } from './payment-result.page';

const OPERATION_ID = 'op-1';

function status(overrides: Partial<SubscriptionOperationStatusView> = {}): SubscriptionOperationStatusView {
  return {
    operationId: OPERATION_ID,
    status: 'PendingPayment',
    requiresPayment: true,
    paymentState: null,
    canRetryPayment: false,
    subscriptionStatus: null,
    provisioningStatus: null,
    redirectUrl: null,
    targetPackageId: 'pkg-1',
    amount: 199,
    currency: 'SAR',
    subscriptionId: null,
    failureCode: null,
    createdAt: '2026-09-22T10:00:00.000Z',
    expiresAt: null,
    completedAt: null,
    ...overrides,
  };
}

const SETTLING = status({ paymentState: 'Pending' });
const COMPLETED = status({
  status: 'Completed',
  paymentState: 'Paid',
  completedAt: '2026-09-22T11:00:00.000Z',
});

function failure(httpStatus: number): BroochError {
  return {
    status: httpStatus,
    code: null,
    message: 'failed',
    messageKey: null,
    correlationId: null,
    traceId: null,
    redirectUrl: null,
    fieldErrors: null,
    requiredPermissions: null,
    retryAfterSeconds: null,
    raw: null,
  };
}

type StatusRead = (call: number) => Observable<SubscriptionOperationStatusView>;

/**
 * The result screen is where a slow or flaky answer used to strand a payer. These cases pin the
 * watch: it polls while the backend settles, stops at a deadline and says so, treats a read
 * lost in transit as a reason to ask again — never as "not found" — and holds still offline.
 * Headings render as raw translation keys, which is exactly the state under test.
 */
describe('PaymentResultPage', () => {
  let loadOperation: ReturnType<typeof vi.fn>;
  let verifyPayment: ReturnType<typeof vi.fn>;
  let markOnboardingComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function render(
    reads: StatusRead,
    query: Record<string, string> = { operationId: OPERATION_ID },
    verdict?: Observable<SubscriptionPaymentResult>,
  ): ComponentFixture<PaymentResultPage> {
    let calls = 0;
    loadOperation = vi.fn(() => reads(++calls));
    verifyPayment = vi.fn(() => verdict ?? throwError(() => failure(500)));
    markOnboardingComplete = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
        {
          provide: OnboardingService,
          useValue: {
            loadOperation,
            verifyPayment,
            retryPayment: vi.fn(),
            retryProvisioning: vi.fn(),
          },
        },
        { provide: OnboardingCompletion, useValue: { finish: vi.fn() } },
        { provide: SessionStore, useValue: { markOnboardingComplete } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(PaymentResultPage);
    fixture.detectChanges();
    return fixture;
  }

  function heading(fixture: ComponentFixture<PaymentResultPage>): string {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent?.trim() ?? '';
  }

  function advance(fixture: ComponentFixture<PaymentResultPage>, ms: number): void {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  function button(fixture: ComponentFixture<PaymentResultPage>, key: string): HTMLButtonElement {
    const found = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((candidate) => candidate.textContent?.includes(key));
    if (!found) {
      throw new Error(`no button labelled ${key}`);
    }
    return found;
  }

  it('keeps watching while the backend settles, polling in the background', () => {
    const fixture = render(() => of(SETTLING));

    expect(heading(fixture)).toBe('onboarding.result.pending.title');
    advance(fixture, 2_000);

    expect(loadOperation).toHaveBeenCalledTimes(2);
    expect(loadOperation.mock.calls[0]).toEqual([OPERATION_ID, { background: false }]);
    expect(loadOperation.mock.calls[1]).toEqual([OPERATION_ID, { background: true }]);
  });

  it('stops at the deadline and hands the next check to the payer', () => {
    const fixture = render(() => of(SETTLING));

    advance(fixture, 121_000);
    expect(heading(fixture)).toBe('onboarding.result.pendingStalled.title');

    const reads = loadOperation.mock.calls.length;
    advance(fixture, 60_000);
    expect(loadOperation).toHaveBeenCalledTimes(reads);
  });

  it('gives a payer who asks again a fresh window of polling', () => {
    const fixture = render(() => of(SETTLING));
    advance(fixture, 121_000);
    const reads = loadOperation.mock.calls.length;

    button(fixture, 'onboarding.result.checkAgain').click();
    expect(heading(fixture)).toBe('onboarding.result.pending.title');
    expect(loadOperation).toHaveBeenLastCalledWith(OPERATION_ID, { background: false });

    advance(fixture, 2_000);
    expect(loadOperation).toHaveBeenCalledTimes(reads + 2);
  });

  it('retries a read lost in transit instead of calling the purchase missing', () => {
    const fixture = render((call) => (call === 1 ? throwError(() => failure(0)) : of(SETTLING)));

    expect(heading(fixture)).toBe('onboarding.result.loading.title');
    advance(fixture, 3_000);
    expect(heading(fixture)).toBe('onboarding.result.pending.title');
  });

  it('says the payment could not be checked when every read fails in transit', () => {
    const fixture = render(() => throwError(() => failure(503)));

    advance(fixture, 130_000);
    expect(heading(fixture)).toBe('onboarding.result.unreachable.title');
  });

  it('takes a refusal as an answer and does not retry it', () => {
    const fixture = render(() => throwError(() => failure(404)));

    expect(heading(fixture)).toBe('onboarding.result.unknown.title');
    advance(fixture, 30_000);
    expect(loadOperation).toHaveBeenCalledTimes(1);
  });

  it('asks for the payment when nothing is in flight', () => {
    const fixture = render(() => of(status({ paymentState: null })));

    expect(heading(fixture)).toBe('onboarding.result.awaiting.title');
    advance(fixture, 10_000);
    expect(loadOperation).toHaveBeenCalledTimes(1);
  });

  it('holds still offline and checks again the moment the connection returns', () => {
    const fixture = render(() => of(SETTLING));

    window.dispatchEvent(new Event('offline'));
    advance(fixture, 10_000);
    expect(loadOperation).toHaveBeenCalledTimes(1);
    expect(heading(fixture)).toBe('onboarding.result.pending.title');

    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(loadOperation).toHaveBeenCalledTimes(2);
  });

  it('lands on the receipt and closes the wizard once the purchase completes', () => {
    const fixture = render((call) => of(call < 2 ? SETTLING : COMPLETED));

    advance(fixture, 2_000);

    expect(heading(fixture)).toBe('onboarding.result.completed.title');
    expect(markOnboardingComplete).toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-payment-receipt')).not.toBeNull();
  });

  it('keeps watching a paid purchase before provisioning reports Running, until it completes', () => {
    const paidNotStarted = status({ status: 'PaymentConfirmed', paymentState: 'Paid' });
    const fixture = render((call) => of(call < 3 ? paidNotStarted : COMPLETED));

    expect(heading(fixture)).toBe('onboarding.result.provisioning.title');
    advance(fixture, 4_000);

    expect(heading(fixture)).toBe('onboarding.result.completed.title');
  });

  it('never asks for a payment the backend already reports as paid', () => {
    const fixture = render(() => of(status({ status: 'PendingPayment', paymentState: 'Paid' })));

    expect(heading(fixture)).toBe('onboarding.result.pending.title');
    advance(fixture, 2_000);
    expect(loadOperation).toHaveBeenCalledTimes(2);
  });

  it('renders the verified verdict, never the status the provider put on the URL', () => {
    const verdict = of({
      operationId: OPERATION_ID,
      paymentState: 'Failed',
      status: 'PaymentFailed',
      requiresRedirect: false,
      redirectUrl: null,
      canRetryPayment: true,
      subscriptionStatus: null,
      provisioningStatus: null,
      subscriptionId: null,
      requiresReauthentication: false,
      attemptNumber: 1,
      cardBrand: 'visa',
      cardLastFour: '4242',
      amount: 199,
      currency: 'SAR',
      completionUrl: null,
      failureCode: null,
    } satisfies SubscriptionPaymentResult);
    const fixture = render(
      () => of(status({ status: 'PaymentFailed', paymentState: 'Failed', canRetryPayment: true })),
      { operationId: OPERATION_ID, id: 'pay_1', status: 'paid', message: 'APPROVED' },
      verdict,
    );

    expect(verifyPayment).toHaveBeenCalledWith(OPERATION_ID, 'pay_1');
    expect(heading(fixture)).toBe('onboarding.result.failed.title');
  });
});
