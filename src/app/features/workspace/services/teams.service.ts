import { Service, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { PERMISSIONS } from '../../../constants/app.constants';
import { MembersApi, RolesApi, TeamsApi } from '../../../core/api/workspace-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import {
  AddTeamMemberRequest,
  CreateTeamRequest,
  MemberListItem,
  TeamDetailDto,
  TeamMembershipDdlItem,
  TeamNode,
  UpdateTeamRequest,
} from '../models/workspace-feature.model';

@Service()
export class TeamsService {
  private readonly teamsApi = inject(TeamsApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly membersApi = inject(MembersApi);
  private readonly session = inject(SessionStore);

  canManageTeams(): boolean {
    return this.session.hasPermission(PERMISSIONS.teamsManage);
  }

  canReadMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsRead);
  }

  loadTree(): Observable<TeamNode[]> {
    return this.teamsApi.tree();
  }

  loadMembershipsDdl(teamId: string): Observable<TeamMembershipDdlItem[]> {
    return this.teamsApi.membershipsDdl(teamId);
  }

  loadActiveMembers(): Observable<MemberListItem[]> {
    return this.membersApi
      .list()
      .pipe(map((rows) => rows.filter((row) => row.tenantMembershipStatus === 'Active')));
  }

  loadManagerCandidates(node: TeamNode): Observable<MemberListItem[]> {
    const active = this.loadActiveMembers();

    if (node.kind !== 'Application' || !node.applicationKey) {
      return active;
    }

    const applicationKey = node.applicationKey;
    return this.rolesApi.list(applicationKey).pipe(
      switchMap((roles) => {
        const owner = roles.find((role) => role.isOwnerRole && role.isActive);
        if (!owner) {
          return of([] as MemberListItem[]);
        }
        return this.rolesApi.memberships(owner.id).pipe(
          switchMap((holders) => {
            const ids = new Set(holders.tenantMembershipIds);
            return active.pipe(
              map((members) => members.filter((m) => ids.has(m.tenantMembershipId))),
            );
          }),
        );
      }),
    );
  }

  assignManager(
    teamId: string,
    managerTenantMembershipId: string | null,
  ): Observable<TeamDetailDto> {
    return this.teamsApi.setManager(teamId, { managerTenantMembershipId });
  }

  /** The tree carries no description, so an edit reads it from the application's team list. */
  loadDescription(node: TeamNode): Observable<string | null> {
    return this.teamsApi
      .list({ applicationKey: node.applicationKey ?? undefined })
      .pipe(
        map((teams) => {
          const team = teams.find((entry) => entry.id === node.id);
          if (!team) {
            throw new Error(`Team ${node.id} is not in the ${node.applicationKey} team list.`);
          }
          return team.description;
        }),
      );
  }

  createTeam(request: CreateTeamRequest): Observable<TeamDetailDto> {
    return this.teamsApi.create(request);
  }

  updateTeam(teamId: string, request: UpdateTeamRequest): Observable<TeamDetailDto> {
    return this.teamsApi.update(teamId, request);
  }

  archiveTeam(teamId: string): Observable<void> {
    return this.teamsApi.archive(teamId);
  }

  addMember(teamId: string, request: AddTeamMemberRequest): Observable<void> {
    return this.teamsApi.addMember(teamId, request);
  }

  removeMember(teamId: string, tenantMembershipId: string): Observable<void> {
    return this.teamsApi.removeMember(teamId, tenantMembershipId);
  }
}
