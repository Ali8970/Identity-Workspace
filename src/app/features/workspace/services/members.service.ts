import { Service, inject } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { MembersApi, RolesApi, TeamsApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import { PERMISSIONS } from '../../../constants/app.constants';
import { TenantMembershipStatus } from '../../../enums/domain.enums';
import {
  AddMemberFormValue,
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
  ResendActivationResult,
  RoleListItem,
  TeamListItem,
  TeamNode,
} from '../models/workspace-feature.model';
import { RoleGrantScope, RolesService } from './roles.service';

export interface InviteTeamOption {
  id: string;
  name: string;
  kind: string;
  depth: number;
  trail: string[];
}

export interface InviteApplication {
  key: string;
  roles: RoleListItem[];
  teams: InviteTeamOption[];
}

export interface FlatTeamOption {
  id: string;
  name: string;
  depth: number;
  kind: string;
}

export type MemberActivation = 'pending' | 'done';

export const MEMBER_STATUSES: readonly TenantMembershipStatus[] = [
  'Active',
  'Suspended',
  'Removed',
];

@Service()
export class MembersService {
  private readonly membersApi = inject(MembersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly rolesService = inject(RolesService);
  private readonly session = inject(SessionStore);

  canReadMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsRead);
  }

  canCreateMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsManage);
  }

  loadMembers(status?: TenantMembershipStatus | ''): Observable<MemberListItem[]> {
    return this.membersApi.list(status ? { status } : {});
  }

  loadLookups(): Observable<{ roles: RoleListItem[]; teams: TeamNode[] }> {
    return forkJoin({
      roles: this.rolesApi.list(),
      teams: this.teamsApi.tree(),
    });
  }

  loadMemberTeams(tenantMembershipId: string): Observable<TeamListItem[]> {
    return this.teamsApi.list({ tenantMembershipId });
  }

  flattenTeams(nodes: TeamNode[], depth = 0): FlatTeamOption[] {
    const rows: FlatTeamOption[] = [];
    for (const node of nodes) {
      rows.push({ id: node.id, name: node.name, depth, kind: node.kind });
      if (node.children.length > 0) {
        rows.push(...this.flattenTeams(node.children, depth + 1));
      }
    }
    return rows;
  }

  activationOf(row: MemberListItem): MemberActivation {
    return row.userStatus === 'PendingActivation' ? 'pending' : 'done';
  }

  loadInviteGrantScope(): Observable<RoleGrantScope | null> {
    return this.rolesService.loadGrantScope().pipe(catchError(() => of(null)));
  }

  inviteCatalog(roles: RoleListItem[], teams: TeamNode[]): InviteApplication[] {
    const byKey = new Map<string, InviteApplication>();
    const entry = (key: string): InviteApplication => {
      let application = byKey.get(key);
      if (!application) {
        application = { key, roles: [], teams: [] };
        byKey.set(key, application);
      }
      return application;
    };

    for (const role of roles) {
      if (role.isActive) {
        entry(role.applicationKey).roles.push(role);
      }
    }

    const walk = (nodes: TeamNode[], trail: string[], depth: number): void => {
      for (const node of nodes) {
        const scoped = node.kind !== 'Organization' && !!node.applicationKey;
        if (scoped) {
          entry(node.applicationKey as string).teams.push({
            id: node.id,
            name: node.name,
            kind: node.kind,
            depth,
            trail,
          });
        }
        walk(node.children, scoped ? [...trail, node.name] : trail, scoped ? depth + 1 : depth);
      }
    };
    walk(teams, [], 0);

    for (const application of byKey.values()) {
      application.roles.sort(
        (a, b) =>
          Number(b.isOwnerRole) - Number(a.isOwnerRole) ||
          Number(b.isSystem) - Number(a.isSystem) ||
          a.nameEn.localeCompare(b.nameEn),
      );
    }

    return [...byKey.values()];
  }

  canGrantRole(scope: RoleGrantScope | null, role: RoleListItem): boolean {
    if (!scope || scope.isOwner) {
      return true;
    }
    const held = scope.keysByApplication.get(role.applicationKey);
    return role.permissionKeys.every((key) => held?.has(key) ?? false);
  }

  inviteMember(
    form: AddMemberFormValue,
    applications: InviteApplication[],
  ): Observable<AddMemberResult> {
    const selected = applications.filter((application) =>
      form.applicationKeys.includes(application.key),
    );
    const roleIds = new Set(form.roleIds);
    const teamIds = new Set(form.teamIds);
    const request: AddMemberRequest = {
      email: form.email.trim(),
      // The DTO types these as nullable — send null, not '', so an omitted name is
      // omitted rather than stored as an empty string (matches RegisterService).
      arabicName: form.arabicName.trim() || null,
      englishName: form.englishName.trim() || null,
      roleIds: selected.flatMap((application) =>
        application.roles.filter((role) => roleIds.has(role.id)).map((role) => role.id),
      ),
      teamIds: selected.flatMap((application) =>
        application.teams.filter((team) => teamIds.has(team.id)).map((team) => team.id),
      ),
    };
    return this.membersApi.add(request);
  }

  /** Replaces the member's whole role set; at least one role is required. */
  updateMemberRoles(tenantMembershipId: string, roleIds: string[]): Observable<MemberRolesDto> {
    return this.membersApi.updateRoles(tenantMembershipId, roleIds);
  }

  memberRoles(tenantMembershipId: string): Observable<MemberRolesDto> {
    return this.membersApi.roles(tenantMembershipId);
  }

  resendActivation(tenantMembershipId: string): Observable<ResendActivationResult> {
    return this.membersApi.resendActivation(tenantMembershipId);
  }

  removeMember(tenantMembershipId: string): Observable<void> {
    return this.membersApi.remove(tenantMembershipId);
  }
}
