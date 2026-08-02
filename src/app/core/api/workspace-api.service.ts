import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { TenantMembershipStatus } from '../../enums/domain.enums';
import { ApiResponse } from '../../models/api-response.model';
import { unwrapData } from './unwrap';
import {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
  PackageDto,
  PagedResult,
  PermissionCatalogItem,
  RoleListItem,
  SetTeamManagerRequest,
  TeamDetailDto,
  TeamMembershipDdlItem,
  TeamNode,
  TenantDto,
  TenantMeResponseWire,
  UpdateTenantProfileRequest,
  readTenantId,
} from '../../models/workspace.model';

export type {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
  PackageDto,
  PermissionCatalogItem,
  RoleListItem,
  SetTeamManagerRequest,
  TeamDetailDto,
  TeamMembershipDdlItem,
  TeamNode,
  TenantDto,
} from '../../models/workspace.model';

/** Drops undefined entries so we never send `?search=undefined`. */
function toParams(values: Record<string, string | boolean | undefined>): HttpParams | undefined {
  let params = new HttpParams();
  let any = false;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') {
      continue;
    }
    params = params.set(key, value);
    any = true;
  }
  return any ? params : undefined;
}

export interface MemberListFilters {
  search?: string;
  status?: TenantMembershipStatus;
}

/**
 * People inside the CURRENT company. The company is taken from the session,
 * never from the URL — these routes carry no tenantId.
 */
@Service()
export class MembersApi {
  private readonly http = inject(HttpClient);

  list(filters: MemberListFilters = {}): Observable<MemberListItem[]> {
    return this.http
      .get<ApiResponse<MemberListItem[]>>(API_ROUTES.memberships, {
        withCredentials: true,
        params: toParams({ search: filters.search, status: filters.status }),
      })
      .pipe(unwrapData());
  }

  /** 201 on success. Creates the account when the email is new, else reuses it. */
  add(request: AddMemberRequest): Observable<AddMemberResult> {
    return this.http
      .post<ApiResponse<AddMemberResult>>(API_ROUTES.memberships, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  /** Replaces the member's whole role set; at least one role is required. */
  updateRoles(tenantMembershipId: string, roleIds: string[]): Observable<MemberRolesDto> {
    return this.http
      .put<ApiResponse<MemberRolesDto>>(
        API_ROUTES.membershipRoles(tenantMembershipId),
        { roleIds },
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  roles(tenantMembershipId: string): Observable<MemberRolesDto> {
    return this.http
      .get<ApiResponse<MemberRolesDto>>(API_ROUTES.membershipRoles(tenantMembershipId), {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }
}

/** Roles defined in the current company, optionally narrowed to one application. */
@Service()
export class RolesApi {
  private readonly http = inject(HttpClient);

  list(applicationKey?: string): Observable<RoleListItem[]> {
    return this.http
      .get<ApiResponse<RoleListItem[]>>(API_ROUTES.roles, {
        withCredentials: true,
        params: toParams({ applicationKey }),
      })
      .pipe(
        unwrapData(),
        // `permissionKeys` is declared non-nullable, so make that true here rather than
        // defending against null in every consumer.
        map((roles) =>
          roles.map((role) => ({ ...role, permissionKeys: role.permissionKeys ?? [] })),
        ),
      );
  }
}

@Service()
export class PermissionsApi {
  private readonly http = inject(HttpClient);

  /** Omit applicationKey for the whole catalogue. */
  catalog(applicationKey?: string): Observable<PermissionCatalogItem[]> {
    return this.http
      .get<ApiResponse<PermissionCatalogItem[]>>(API_ROUTES.permissions, {
        withCredentials: true,
        params: toParams({ applicationKey }),
      })
      .pipe(unwrapData());
  }
}

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
      .get<ApiResponse<TeamNode[] | null>>(API_ROUTES.teamsTree, { withCredentials: true })
      .pipe(map((response) => normalizeTeamNodes(response.data)));
  }

  membershipsDdl(teamId: string): Observable<TeamMembershipDdlItem[]> {
    return this.http
      .get<ApiResponse<TeamMembershipDdlItem[] | null>>(API_ROUTES.teamMembershipsDdl(teamId), {
        withCredentials: true,
      })
      .pipe(map((response) => response.data ?? []));
  }

  setManager(teamId: string, request: SetTeamManagerRequest): Observable<TeamDetailDto> {
    return this.http
      .put<ApiResponse<TeamDetailDto>>(API_ROUTES.teamManager(teamId), request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }
}

@Service()
export class TenantApi {
  private readonly http = inject(HttpClient);

  get(): Observable<TenantDto> {
    return this.http
      .get<ApiResponse<TenantMeResponseWire>>(API_ROUTES.tenant, { withCredentials: true })
      .pipe(
        unwrapData(),
        map((tenant) => ({
          // GET /tenant is the only route that may serialise the id as { value }.
          tenantId: readTenantId(tenant.tenantId),
          companyNameAr: tenant.companyNameAr,
          companyNameEn: tenant.companyNameEn,
          status: tenant.status,
          onboardingState: tenant.onboardingState,
          onboardingCompleted: tenant.onboardingCompleted,
        })),
      );
  }

  /** Responds with message only — no data payload. */
  updateProfile(request: UpdateTenantProfileRequest): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(API_ROUTES.tenantProfile, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  packages(): Observable<PackageDto[]> {
    return this.http
      .get<ApiResponse<PagedResult<PackageDto>>>(API_ROUTES.packages, { withCredentials: true })
      .pipe(
        unwrapData(),
        map((page) => page.items ?? []),
      );
  }

  startFreeTrial(packageId: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(API_ROUTES.freeTrial, { packageId }, { withCredentials: true })
      .pipe(unwrapData());
  }
}
