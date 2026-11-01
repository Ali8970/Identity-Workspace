import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { TEAM_ENDPOINTS } from '../constants/team.endpoints';
import {
  AddTeamMemberRequest,
  CreateTeamRequest,
  SetTeamManagerRequest,
  TeamDetailDto,
  TeamListFilters,
  TeamListItem,
  TeamMembershipDdlItem,
  TeamNode,
  UpdateTeamRequest,
} from '../models/team.model';
import { unwrapData } from '@core/http/unwrap';
import { toParams } from '@core/http/http-params';
import { ApiResponse } from '@shared/models/api-response.model';

/**
 * `TeamNode.children` is declared non-nullable but the API omits it on leaf nodes.
 * Normalising once here keeps every consumer (tree rendering, flatten, count) on the
 * same contract instead of each guessing whether it has to defend against null.
 */
function normalizeTeamNodes(nodes: TeamNode[] | null | undefined): TeamNode[] {
  return (nodes ?? []).map((node) => ({
    ...node,
    children: normalizeTeamNodes(node.children),
  }));
}

@Service()
export class TeamsApi {
  private readonly http = inject(HttpClient);

  tree(): Observable<TeamNode[]> {
    return this.http
      .get<ApiResponse<TeamNode[] | null>>(TEAM_ENDPOINTS.teamsTree, { withCredentials: true })
      .pipe(map((response) => normalizeTeamNodes(response.data)));
  }

  membershipsDdl(teamId: string): Observable<TeamMembershipDdlItem[]> {
    return this.http
      .get<ApiResponse<TeamMembershipDdlItem[] | null>>(TEAM_ENDPOINTS.teamMembershipsDdl(teamId), {
        withCredentials: true,
      })
      .pipe(map((response) => response.data ?? []));
  }

  setManager(teamId: string, request: SetTeamManagerRequest): Observable<TeamDetailDto> {
    return this.http
      .put<ApiResponse<TeamDetailDto>>(TEAM_ENDPOINTS.teamManager(teamId), request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  list(filters: TeamListFilters = {}): Observable<TeamListItem[]> {
    return this.http
      .get<ApiResponse<TeamListItem[] | null>>(TEAM_ENDPOINTS.teams, {
        withCredentials: true,
        params: toParams({
          applicationKey: filters.applicationKey,
          tenantMembershipId: filters.tenantMembershipId,
        }),
      })
      .pipe(map((response) => response.data ?? []));
  }

  missingManager(): Observable<TeamListItem[]> {
    return this.http
      .get<ApiResponse<TeamListItem[] | null>>(TEAM_ENDPOINTS.teamsMissingManager, {
        withCredentials: true,
      })
      .pipe(map((response) => response.data ?? []));
  }

  create(request: CreateTeamRequest): Observable<TeamDetailDto> {
    return this.http
      .post<ApiResponse<TeamDetailDto>>(TEAM_ENDPOINTS.teams, request, { withCredentials: true })
      .pipe(unwrapData());
  }

  update(teamId: string, request: UpdateTeamRequest): Observable<TeamDetailDto> {
    return this.http
      .put<ApiResponse<TeamDetailDto>>(TEAM_ENDPOINTS.team(teamId), request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  archive(teamId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(TEAM_ENDPOINTS.team(teamId), { withCredentials: true })
      .pipe(map(() => undefined));
  }

  addMember(teamId: string, request: AddTeamMemberRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(TEAM_ENDPOINTS.teamMembers(teamId), request, {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }

  removeMember(teamId: string, tenantMembershipId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(TEAM_ENDPOINTS.teamMember(teamId, tenantMembershipId), {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }
}
