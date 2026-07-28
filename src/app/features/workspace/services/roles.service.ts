import { Service, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RolesApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { RoleListItem } from '../models/workspace-feature.model';

@Service()
export class RolesService {
  private readonly rolesApi = inject(RolesApi);
  private readonly session = inject(SessionStore);

  listForCurrentTenant(): Observable<RoleListItem[]> {
    const tenantId = this.session.currentTenant()?.tenantId;
    if (!tenantId) {
      return of([]);
    }
    return this.rolesApi.list(tenantId);
  }
}
