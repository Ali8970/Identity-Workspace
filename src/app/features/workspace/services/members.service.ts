import { Service, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { MembersApi, RolesApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { PERMISSIONS } from '../../../constants/app.constants';
import {
  AddMemberFormValue,
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  RoleListItem,
} from '../models/workspace-feature.model';

@Service()
export class MembersService {
  private readonly membersApi = inject(MembersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly session = inject(SessionStore);

  currentTenantId(): string | null {
    return this.session.currentTenant()?.tenantId ?? null;
  }

  canCreateMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.usersCreate);
  }

  loadMembersAndRoles(): Observable<{ members: MemberListItem[]; roles: RoleListItem[] }> {
    const tenantId = this.currentTenantId();
    if (!tenantId) {
      return of({ members: [], roles: [] });
    }
    return forkJoin({
      members: this.membersApi.list(tenantId),
      roles: this.rolesApi.list(tenantId),
    });
  }

  inviteMember(form: AddMemberFormValue, identityRoleId: string | null): Observable<AddMemberResult> {
    const tenantId = this.currentTenantId();
    if (!tenantId) {
      throw new Error('No tenant selected');
    }
    const request: AddMemberRequest = {
      email: form.email.trim(),
      arabicName: form.arabicName.trim(),
      englishName: form.englishName.trim(),
      roleIds: identityRoleId ? [identityRoleId] : [],
      teamIds: [],
    };
    return this.membersApi.add(tenantId, request);
  }

  findIdentityRole(roles: RoleListItem[]): RoleListItem | undefined {
    return roles.find((r) => r.applicationKey === 'identity');
  }
}
