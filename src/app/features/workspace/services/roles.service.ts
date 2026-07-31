import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RolesApi } from '../../../core/api/workspace-api.service';
import { RoleListItem } from '../models/workspace-feature.model';

@Service()
export class RolesService {
  private readonly rolesApi = inject(RolesApi);

  /** Roles of the company the session is bound to; optionally one application. */
  listForCurrentTenant(applicationKey?: string): Observable<RoleListItem[]> {
    return this.rolesApi.list(applicationKey);
  }
}
