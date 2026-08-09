import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SubscriptionApi } from '../../../core/api/subscription-api.service';
import { TenantApi } from '../../../core/api/workspace-api.service';
import {
  AvailablePackageView,
  CurrentSubscriptionView,
  SubscriptionChangeResult,
  SubscriptionOperationStatusView,
  SubscriptionPaymentResult,
  SubscriptionProvisioningRetryResult,
  SubscriptionRetryPaymentResult,
} from '../../../models/subscription.model';
import { CompanyProfileFormValue, TenantDto } from '../models/onboarding-feature.model';

/**
 * The onboarding journey's view of the API: company profile from Tenant, everything about the
 * purchase from Subscription. Pages talk to this, never to `HttpClient`.
 */
@Service()
export class OnboardingService {
  private readonly tenantApi = inject(TenantApi);
  private readonly subscriptionApi = inject(SubscriptionApi);

  /** The authority on onboarding progress. */
  loadTenant(): Observable<TenantDto> {
    return this.tenantApi.get();
  }

  /** Where an interrupted journey resumes from — never `sessionStorage`. */
  loadCurrentSubscription(): Observable<CurrentSubscriptionView> {
    return this.subscriptionApi.current();
  }

  /**
   * The catalogue, ordered by the server's `displayOrder` so the cheapest-looking package
   * never silently floats to the top: presentation order is the server's call.
   */
  loadPackages(): Observable<AvailablePackageView[]> {
    return this.subscriptionApi
      .availablePackages()
      .pipe(map((packages) => [...packages].sort((a, b) => a.displayOrder - b.displayOrder)));
  }

  /** `null` preserves the stored value, so an untouched field is omitted rather than blanked. */
  saveCompanyProfile(value: CompanyProfileFormValue): Observable<void> {
    return this.tenantApi.updateProfile({
      companyNameAr: emptyToNull(value.arabicCompanyName),
      companyNameEn: emptyToNull(value.englishCompanyName),
    });
  }

  startSubscription(packageId: string): Observable<SubscriptionChangeResult> {
    return this.subscriptionApi.start({ packageId });
  }

  /** The token is the entire request body — see `SubscriptionApi.pay`. */
  payOperation(operationId: string, token: string): Observable<SubscriptionPaymentResult> {
    return this.subscriptionApi.pay(operationId, { token });
  }

  verifyPayment(
    operationId: string,
    providerPaymentId: string,
  ): Observable<SubscriptionPaymentResult> {
    return this.subscriptionApi.verifyPayment(operationId, { providerPaymentId });
  }

  loadOperation(operationId: string): Observable<SubscriptionOperationStatusView> {
    return this.subscriptionApi.operation(operationId);
  }

  retryPayment(operationId: string): Observable<SubscriptionRetryPaymentResult> {
    return this.subscriptionApi.retryPayment(operationId);
  }

  retryProvisioning(operationId: string): Observable<SubscriptionProvisioningRetryResult> {
    return this.subscriptionApi.retryProvisioning(operationId);
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
