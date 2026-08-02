import { Service, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthFlowStore } from '../../../core/auth/auth-flow.store';
import { SessionStore } from '../../../core/auth/session.store';
import { SelectMembershipResponse } from '../../../models/auth.model';

/**
 * What the picker needs to render one company, from either source.
 *
 * The login response (`AvailableTenantDto`) and `GET /me/companies` (`MyCompanyDto`)
 * describe the same companies with different fields, so the page renders this instead
 * of either DTO directly.
 */
export interface SelectableCompany {
  tenantMembershipId: string;
  companyNameAr: string;
  companyNameEn: string;
  status: string;
  isOwner: boolean;
  /**
   * Only the login response carries subscription state; `GET /me/companies` does not.
   * Null on the reload path, and the badge is then simply not rendered — better than
   * asserting a subscription state the API never told us.
   */
  hasActiveSubscription: boolean | null;
}

@Service()
export class SelectCompanyService {
  private readonly session = inject(SessionStore);
  readonly flow = inject(AuthFlowStore);

  /**
   * Prefers the list captured at login. After a reload that in-memory list is gone while
   * the cookie session is still in Selection stage, so fall back to the companies the
   * session bootstrap already fetched — otherwise the picker renders empty.
   */
  readonly companies = computed<SelectableCompany[]>(() => {
    const fromLogin = this.flow.availableCompanies();
    if (fromLogin.length > 0) {
      return fromLogin.map((company) => ({
        tenantMembershipId: company.tenantMembershipId,
        companyNameAr: company.companyNameAr,
        companyNameEn: company.companyNameEn,
        status: company.status,
        isOwner: company.isOwner,
        hasActiveSubscription: company.hasActiveSubscription,
      }));
    }

    return this.session
      .companies()
      .filter((company) => company.isSelectable)
      .map((company) => ({
        tenantMembershipId: company.tenantMembershipId,
        companyNameAr: company.companyNameAr,
        companyNameEn: company.companyNameEn,
        status: company.tenantStatus,
        isOwner: company.isOwner,
        hasActiveSubscription: null,
      }));
  });

  selectCompany(tenantMembershipId: string): Observable<SelectMembershipResponse> {
    return this.session.selectMembership({
      tenantMembershipId,
      intentId: this.flow.intentId(),
    });
  }

  refreshSession(): Observable<unknown> {
    return this.session.refresh();
  }

  clearFlow(): void {
    this.flow.clear();
  }
}
