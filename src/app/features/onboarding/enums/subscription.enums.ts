/** OpenAPI TenantOnboardingState (includes provisioning steps). */
export type TenantOnboardingState =
  | 'Registered'
  | 'ProfileSaved'
  | 'SubscriptionActive'
  | 'CrmProvisioned'
  | 'TeamsProvisioned'
  | 'Completed';

/** Effective subscription status — already computed server-side against the current time. */
export type SubscriptionStatus =
  | 'PendingActivation'
  | 'Trial'
  | 'Active'
  | 'GracePeriod'
  | 'PastDue'
  | 'Suspended'
  | 'Expired'
  | 'Canceled';

/**
 * Where a purchase is. `PaymentFailed` and `ProvisioningFailed` are deliberately NOT terminal:
 * both are recoverable, and treating either as final costs the tenant a purchase they are
 * part-way through.
 */
export type SubscriptionOperationStatus =
  | 'PendingPayment'
  | 'PaymentFailed'
  | 'PaymentConfirmed'
  | 'Completed'
  | 'ActivationFailed'
  | 'ProvisioningFailed'
  | 'Cancelled'
  | 'Expired';

/** `paymentState` on GET /subscription-operations/{id}. Null when the operation is free. */
export type SubscriptionPaymentState =
  | 'NotStarted'
  | 'Pending'
  | 'Processing'
  | 'Paid'
  | 'Failed'
  | 'Cancelled'
  | 'Expired'
  | 'Refunded';

/**
 * `paymentState` on POST …/pay and …/payments/verify — what the provider was *verified*
 * to have done. The narrower of the two payment enums.
 */
export type TokenizedPaymentState = 'NotStarted' | 'Processing' | 'Paid' | 'Failed' | 'Refunded';

export type SubscriptionProvisioningState = 'Running' | 'Completed' | 'Failed';

/** Why the server refuses a package for THIS tenant. Never inferred client-side. */
export type PackageDisabledReason =
  | 'alreadyCurrent'
  | 'trialAlreadyRedeemed'
  | 'downgradeNotSupported';

const TERMINAL_OPERATION_STATUSES: readonly SubscriptionOperationStatus[] = [
  'Completed',
  'ActivationFailed',
  'Cancelled',
  'Expired',
];

/**
 * True when the purchase will not change again on its own, so polling must stop.
 *
 * An unrecognised status answers false: a wire addition should keep the result screen
 * checking rather than freeze it on a state it does not understand.
 */
export function isTerminalOperationStatus(
  status: SubscriptionOperationStatus | string | null | undefined,
): boolean {
  return TERMINAL_OPERATION_STATUSES.includes(status as SubscriptionOperationStatus);
}

export const ONBOARDING_ORDER: TenantOnboardingState[] = [
  'Registered',
  'ProfileSaved',
  'SubscriptionActive',
  'CrmProvisioned',
  'TeamsProvisioned',
  'Completed',
];

/**
 * True once the tenant owns a subscription, i.e. the package step is already done.
 * An unrecognised state answers false so a wire change can never lock a real onboarding out.
 */
export function hasSubscription(state: TenantOnboardingState | string | null | undefined): boolean {
  const index = ONBOARDING_ORDER.indexOf(state as TenantOnboardingState);
  return index >= 0 && index >= ONBOARDING_ORDER.indexOf('SubscriptionActive');
}
