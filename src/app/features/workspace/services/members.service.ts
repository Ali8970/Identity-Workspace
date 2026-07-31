import { Service, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { MembersApi, RolesApi, TeamsApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { PERMISSIONS } from '../../../constants/app.constants';
import {
  AddMemberFormValue,
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  RoleListItem,
  TeamNode,
} from '../models/workspace-feature.model';

export interface FlatTeamOption {
  id: string;
  name: string;
  depth: number;
}

@Service()
export class MembersService {
  private readonly membersApi = inject(MembersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly session = inject(SessionStore);

  currentTenantId(): string | null {
    return this.session.currentTenant()?.tenantId ?? null;
  }

  canCreateMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.usersCreate);
  }

  loadMembersRolesAndTeams(): Observable<{
    members: MemberListItem[];
    roles: RoleListItem[];
    teams: TeamNode[];
  }> {
    const tenantId = this.currentTenantId();
    if (!tenantId) {
      return of({ members: [], roles: [], teams: [] });
    }
    return forkJoin({
      members: this.membersApi.list(tenantId),
      roles: this.rolesApi.list(tenantId),
      teams: this.teamsApi.tree(),
    });
  }

  flattenTeams(nodes: TeamNode[], depth = 0): FlatTeamOption[] {
    const rows: FlatTeamOption[] = [];
    for (const node of nodes) {
      rows.push({ id: node.id, name: node.name, depth });
      if (node.children.length > 0) {
        rows.push(...this.flattenTeams(node.children, depth + 1));
      }
    }
    return rows;
  }

  inviteMember(form: AddMemberFormValue): Observable<AddMemberResult> {
    const tenantId = this.currentTenantId();
    if (!tenantId) {
      throw new Error('No tenant selected');
    }
    const request: AddMemberRequest = {
      email: form.email.trim(),
      arabicName: form.arabicName.trim(),
      englishName: form.englishName.trim(),
      roleIds: form.roleIds,
      teamIds: form.teamIds,
    };
    return this.membersApi.add(tenantId, request);
  }
}
