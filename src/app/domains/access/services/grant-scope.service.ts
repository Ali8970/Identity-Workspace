import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MeApi } from '@core/auth/me-api.service';
import { RoleGrantScope } from '../models/grant-scope.model';

/** Grant scope shared by role editing and member invites (both must offer the same grants). */
@Service()
export class GrantScopeService {
  private readonly meApi = inject(MeApi);

  load(): Observable<RoleGrantScope> {
    return this.meApi.access().pipe(
      map((access) => {
        const keysByApplication = new Map<string, Set<string>>();
        for (const role of access.roles) {
          const keys = keysByApplication.get(role.application.code) ?? new Set<string>();
          for (const key of role.permissionKeys ?? []) {
            keys.add(key);
          }
          keysByApplication.set(role.application.code, keys);
        }
        return { isOwner: access.isOwner, keysByApplication };
      }),
    );
  }
}
