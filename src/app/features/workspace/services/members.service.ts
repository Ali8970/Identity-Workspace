import { Service, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { MembersApi, RolesApi, TeamsApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { PERMISSIONS } from '../../../constants/app.constants';
import {
  AddMemberFormValue,
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
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

  canCreateMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsManage);
  }

  loadMembersRolesAndTeams(): Observable<{
    members: MemberListItem[];
    roles: RoleListItem[];
    teams: TeamNode[];
  }> {
    // The company comes from the session cookie, so these routes need no tenantId.
    return forkJoin({
      members: this.membersApi.list(),
      roles: this.rolesApi.list(),
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
    const request: AddMemberRequest = {
      email: form.email.trim(),
      // The DTO types these as nullable — send null, not '', so an omitted name is
      // omitted rather than stored as an empty string (matches RegisterService).
      arabicName: form.arabicName.trim() || null,
      englishName: form.englishName.trim() || null,
      roleIds: form.roleIds,
      teamIds: form.teamIds,
    };
    return this.membersApi.add(request);
  }

  /** Replaces the member's whole role set; at least one role is required. */
  updateMemberRoles(tenantMembershipId: string, roleIds: string[]): Observable<MemberRolesDto> {
    return this.membersApi.updateRoles(tenantMembershipId, roleIds);
  }
}
