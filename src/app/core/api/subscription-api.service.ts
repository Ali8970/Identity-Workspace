import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { ApiResponse } from '../../models/api-response.model';
import {
  AvailablePackageView,
  CurrentSubscriptionView,
  PaySubscriptionOperationRequest,
  StartSubscriptionRequest,
  SubscriptionChangeResult,
  SubscriptionOperationStatusView,
  SubscriptionPaymentResult,
  SubscriptionProvisioningRetryResult,
  SubscriptionRetryPaymentResult,
  VerifySubscriptionPaymentRequest,
} from '../../models/subscription.model';
import { unwrapData } from './unwrap';

/**
 * The tenant-facing purchase surface — and, for onboarding, the only one.
 *
 * Every route resolves the tenant from the session cookie: no call passes a tenant id, and
 * none accepts a price, a currency or a status. The single payment-ish value the browser ever
 * sends is a temporary token it obtained straight from the provider (see
 * `MoyasarTokenizationService`); the card itself never reaches a Brooch origin.
 */
@Service()
export class SubscriptionApi {
  private readonly http = inject(HttpClient);

  /**
   * The priced, per-tenant catalogue. Requires a session but no permission, so an owner
   * mid-onboarding can always read it. `data` is the array itself, not a paged wrapper.
   */
  availablePackages(): Observable<AvailablePackageView[]> {
    return this.http
      .get<ApiResponse<AvailablePackageView[]>>(API_ROUTES.availablePackages, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  /** Where an interrupted journey left off: live term, pending operation, pending payment. */
  current(): Observable<CurrentSubscriptionView> {
    return this.http
      .get<ApiResponse<CurrentSubscriptionView>>(API_ROUTES.currentSubscription, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  /**
   * Starts a subscription on the chosen package. A free package activates on the spot; a paid
   * one comes back `PendingPayment` with `paymentConfiguration`. The response's
   * `requiresPayment` is the authority — never the catalogue row the user clicked.
   */
  start(request: StartSubscriptionRequest): Observable<SubscriptionChangeResult> {
    return this.http
      .post<ApiResponse<SubscriptionChangeResult>>(API_ROUTES.subscriptions, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  /**
   * Charges the operation with a temporary provider token. The body carries the token and
   * nothing else: amount, currency and package come from the immutable snapshot the backend
   * took when the operation was created, so a tampered request cannot change what is charged.
   */
  pay(
    operationId: string,
    request: PaySubscriptionOperationRequest,
  ): Observable<SubscriptionPaymentResult> {
    return this.http
      .post<ApiResponse<SubscriptionPaymentResult>>(
        API_ROUTES.paySubscriptionOperation(operationId),
        request,
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  /**
   * Confirms a purchase after the payer returns from 3DS. The provider payment id is a handle:
   * the backend re-reads the payment from the provider server-to-server and decides from that
   * alone. Idempotent, and refuses a payment belonging to a different operation.
   */
  verifyPayment(
    operationId: string,
    request: VerifySubscriptionPaymentRequest,
  ): Observable<SubscriptionPaymentResult> {
    return this.http
      .post<ApiResponse<SubscriptionPaymentResult>>(
        API_ROUTES.verifySubscriptionPayment(operationId),
        request,
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  /** The normalized purchase status — the only response that may be treated as proof. */
  operation(operationId: string): Observable<SubscriptionOperationStatusView> {
    return this.http
      .get<ApiResponse<SubscriptionOperationStatusView>>(
        API_ROUTES.subscriptionOperation(operationId),
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  /**
   * Reopens a purchase whose payment did not settle, returning fresh tokenization settings for
   * another card. Refused outright once any attempt has succeeded
   * (`409 Subscription.PaymentAlreadyCompleted`), so a paid tenant can never be charged twice.
   */
  retryPayment(operationId: string): Observable<SubscriptionRetryPaymentResult> {
    return this.http
      .post<ApiResponse<SubscriptionRetryPaymentResult>>(
        API_ROUTES.retrySubscriptionPayment(operationId),
        {},
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  /**
   * Resumes setup for a purchase that was paid for but not fully provisioned. Never charges
   * again and never creates a second subscription.
   */
  retryProvisioning(operationId: string): Observable<SubscriptionProvisioningRetryResult> {
    return this.http
      .post<ApiResponse<SubscriptionProvisioningRetryResult>>(
        API_ROUTES.retrySubscriptionProvisioning(operationId),
        {},
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }
}
