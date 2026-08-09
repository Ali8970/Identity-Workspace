import {
  PackageDisabledReason,
  SubscriptionOperationStatus,
  SubscriptionPaymentState,
  SubscriptionProvisioningState,
  SubscriptionStatus,
  TokenizedPaymentState,
} from '../enums/domain.enums';

/**
 * Wire DTOs for the tenant-facing Subscription surface (purchase + payment).
 *
 * Every decision the UI makes about money comes from an explicit field on these types —
 * `isFree`, `requiresPayment`, `isAvailable`, `paymentState`, `canRetryPayment`. Nothing is
 * derived from a price or a display string, and the SPA never sends an amount, a currency
 * or a status back.
 */

export interface SubscriptionFeatureView {
  code: string;
  nameAr: string | null;
  nameEn: string | null;
  isEnabled: boolean;
  limit: number | null;
}

/**
 * GET /subscriptions/available-packages — the priced catalogue, evaluated against THIS tenant.
 *
 * `isFree` decides whether a package is free; a zero `price` does not. `isAvailable` +
 * `disabledReason` are the server's per-tenant verdict and are rendered, never recomputed.
 */
export interface AvailablePackageView {
  packageId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  price: number;
  currency: string;
  billingPeriod: string;
  durationMonths: number;
  isFree: boolean;
  requiresPayment: boolean;
  isTrialAvailable: boolean;
  trialPeriodDays: number | null;
  displayOrder: number;
  includedApplications: string[];
  features: SubscriptionFeatureView[];
  limits: Record<string, number>;
  /**
   * The server's per-tenant verdict on whether this package can be picked right now, and why
   * not. This pair is the ONLY authority on selectability — the SPA never works out for itself
   * that a package is ineligible, because it cannot see what the server is weighing.
   */
  isAvailable: boolean;
  disabledReason: PackageDisabledReason | string | null;
}

/**
 * The public tokenization settings for one paid purchase.
 *
 * The publishable key can only mint a temporary token — it can never move money — which is
 * what makes it safe in a page. It arrives per purchase, so it is never hardcoded, never put
 * in an environment file and never cached across purchases.
 */
export interface PaymentConfiguration {
  provider: string;
  publishableKey: string;
  tokenizationUrl: string;
}

/** POST /subscriptions — the package id and nothing else. */
export interface StartSubscriptionRequest {
  packageId: string;
}

/**
 * POST /subscriptions — the server's decision point between a free package and a paid one.
 *
 * `requiresPayment: false` means the subscription is already active and provisioned.
 * `requiresPayment: true` means a `PendingPayment` operation exists and `paymentConfiguration`
 * is how the browser tokenizes a card. This flag — not the catalogue's — is authoritative.
 */
export interface SubscriptionChangeResult {
  operationId: string;
  status: SubscriptionOperationStatus;
  requiresPayment: boolean;
  paymentConfiguration: PaymentConfiguration | null;
  redirectUrl: string | null;
  amount: number;
  currency: string;
  targetPackageId: string;
  paymentExpiresAt: string | null;
  subscriptionId: string | null;
  requiresReauthentication: boolean;
}

/** POST /subscription-operations/{id}/pay — a temporary provider token, nothing else. */
export interface PaySubscriptionOperationRequest {
  token: string;
}

/** POST /subscription-operations/{id}/payments/verify — a handle to look up, never proof. */
export interface VerifySubscriptionPaymentRequest {
  providerPaymentId: string;
}

/**
 * The answer to a tokenized charge or to a verification.
 *
 * `paymentState` is what the provider was verified to have done, server-to-server. A callback
 * query string never sets it. `requiresRedirect` + `redirectUrl` is a 3DS authentication step,
 * not a hosted checkout.
 */
export interface SubscriptionPaymentResult {
  operationId: string;
  paymentState: TokenizedPaymentState;
  status: SubscriptionOperationStatus;
  requiresRedirect: boolean;
  redirectUrl: string | null;
  canRetryPayment: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  provisioningStatus: SubscriptionProvisioningState | null;
  subscriptionId: string | null;
  requiresReauthentication: boolean;
  attemptNumber: number;
  cardBrand: string | null;
  cardLastFour: string | null;
  amount: number;
  currency: string;
  completionUrl: string | null;
  failureCode: string | null;
}

/**
 * GET /subscription-operations/{id} — the single source of truth for "where is this purchase".
 * The only response a result screen may treat as proof of payment.
 */
export interface SubscriptionOperationStatusView {
  operationId: string;
  status: SubscriptionOperationStatus;
  requiresPayment: boolean;
  paymentState: SubscriptionPaymentState | null;
  canRetryPayment: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  provisioningStatus: SubscriptionProvisioningState | null;
  redirectUrl: string | null;
  targetPackageId: string;
  amount: number;
  currency: string;
  subscriptionId: string | null;
  failureCode: string | null;
  createdAt: string;
  expiresAt: string | null;
  completedAt: string | null;
}

/**
 * POST /subscription-operations/{id}/retry-payment — the same purchase reopened, plus fresh
 * tokenization settings. Every attempt needs a brand-new token; a consumed one is never reused.
 */
export interface SubscriptionRetryPaymentResult {
  operationId: string;
  status: SubscriptionOperationStatus;
  requiresPayment: boolean;
  paymentConfiguration: PaymentConfiguration | null;
  redirectUrl: string | null;
  amount: number;
  currency: string;
  targetPackageId: string;
  subscriptionId: string | null;
  requiresReauthentication: boolean;
  expiresAt: string | null;
}

/** POST /subscription-operations/{id}/retry-provisioning — resumes setup, never charges again. */
export interface SubscriptionProvisioningRetryResult {
  operationId: string;
  status: SubscriptionOperationStatus;
  subscriptionId: string | null;
  requiresReauthentication: boolean;
  redirectUrl: string | null;
}

/** The pending operation as GET /subscriptions/current reports it. */
export interface PendingOperationView {
  operationId: string;
  operationType: string;
  status: SubscriptionOperationStatus;
  targetPackageId: string;
  amount: number;
  currency: string;
  requiresPayment: boolean;
  isPayable: boolean;
  createdAt: string;
  expiresAt: string | null;
  resultingSubscriptionId: string | null;
  failureCode: string | null;
}

/**
 * GET /subscriptions/current — what a resumed journey reads to find out where it left off.
 * `subscription` is the live term; only its presence and the two pending slots drive routing,
 * so it stays opaque here rather than being modelled speculatively.
 */
export interface CurrentSubscriptionView {
  subscription: unknown | null;
  hasActiveSubscription: boolean;
  pendingOperation: PendingOperationView | null;
  pendingPayment: unknown | null;
}

/**
 * True while the backend is still working on the purchase — the provider has not settled, or
 * provisioning is running. This is the poll condition; it is read off the response, never
 * guessed from elapsed time.
 */
export function isOperationSettling(view: SubscriptionOperationStatusView): boolean {
  return (
    view.provisioningStatus === 'Running' ||
    view.paymentState === 'Processing' ||
    view.paymentState === 'Pending'
  );
}
