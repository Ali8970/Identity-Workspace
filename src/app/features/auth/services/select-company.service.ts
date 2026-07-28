import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthFlowStore } from '../../../core/auth/auth-flow.store';
import { SessionStore } from '../../../core/auth/session.store';
import { SelectMembershipResponse } from '../../../models/auth.model';

@Service()
export class SelectCompanyService {
  private readonly session = inject(SessionStore);
  readonly flow = inject(AuthFlowStore);

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
