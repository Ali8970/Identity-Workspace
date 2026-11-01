import { API_BASE as base } from '@core/http/api-base';

/**
 * Tenant profile and subscriptions. Subscription owns every tenant-facing payment route;
 * onboarding never calls a /payments/* endpoint.
 */
export const ONBOARDING_ENDPOINTS = {
  tenant: `${base}/tenant`,
  tenantProfile: `${base}/tenant/profile`,

  availablePackages: `${base}/subscriptions/available-packages`,
  subscriptions: `${base}/subscriptions`,
  currentSubscription: `${base}/subscriptions/current`,
  subscriptionOperation: (operationId: string) =>
    `${base}/subscription-operations/${operationId}`,
  paySubscriptionOperation: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/pay`,
  verifySubscriptionPayment: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/payments/verify`,
  retrySubscriptionPayment: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/retry-payment`,
  retrySubscriptionProvisioning: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/retry-provisioning`,
} as const;
