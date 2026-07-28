import { Service, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { MeApi } from '../../../core/auth/me-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { MyCompanyDto } from '../../../models/auth.model';
import { SessionRowDto } from '../models/workspace-feature.model';

@Service()
export class AccountService {
  private readonly meApi = inject(MeApi);
  private readonly session = inject(SessionStore);

  readonly sessionStore = this.session;

  loadAccountData(): Observable<{ companies: MyCompanyDto[]; sessions: SessionRowDto[] }> {
    return forkJoin({
      companies: this.meApi.companies(),
      sessions: this.meApi.sessions(),
    }).pipe(
      map(({ companies, sessions }) => ({
        companies,
        sessions: sessions as SessionRowDto[],
      })),
    );
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
