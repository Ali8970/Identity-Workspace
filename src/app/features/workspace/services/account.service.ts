import { Service, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { MeApi } from '../../../core/auth/me-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { MyCompanyDto } from '../../../models/auth.model';
import { SessionDto } from '../models/workspace-feature.model';

@Service()
export class AccountService {
  private readonly meApi = inject(MeApi);
  private readonly session = inject(SessionStore);

  readonly sessionStore = this.session;

  loadAccountData(): Observable<{ companies: MyCompanyDto[]; sessions: SessionDto[] }> {
    return forkJoin({
      companies: this.meApi.companies(),
      sessions: this.meApi.sessions(),
    });
  }

  /** Signs one other device out, addressed by its opaque sessionRef. */
  revokeSession(sessionRef: string): Observable<void> {
    return this.meApi.revokeSession(sessionRef);
  }

  switchCompany(tenantMembershipId: string): Observable<unknown> {
    return this.session.switchCompany(tenantMembershipId);
  }

  logout(): Observable<void> {
    return this.session.logout();
  }

  logoutAll(): Observable<void> {
    return this.session.logoutAll();
  }
}
