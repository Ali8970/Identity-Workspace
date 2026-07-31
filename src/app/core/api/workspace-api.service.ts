import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { TenantMembershipStatus } from '../../enums/domain.enums';
import { ApiResponse } from '../../models/api-response.model';
import {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
  PackageDto,
  PagedResult,
  PermissionCatalogItem,
  RoleListItem,
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
  TeamNode,
  TenantDto,
} from '../../models/workspace.model';

function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) {
    throw new Error(response.message || 'Empty API response');
  }
  return response.data;
}

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
      .pipe(map(unwrap));
  }

  /** 201 on success. Creates the account when the email is new, else reuses it. */
  add(request: AddMemberRequest): Observable<AddMemberResult> {
    return this.http
      .post<ApiResponse<AddMemberResult>>(API_ROUTES.memberships, request, {
        withCredentials: true,
      })
      .pipe(map(unwrap));
  }

  /** Replaces the member's whole role set; at least one role is required. */
  updateRoles(tenantMembershipId: string, roleIds: string[]): Observable<MemberRolesDto> {
    return this.http
      .put<ApiResponse<MemberRolesDto>>(
        API_ROUTES.membershipRoles(tenantMembershipId),
        { roleIds },
        { withCredentials: true },
      )
      .pipe(map(unwrap));
  }

  roles(tenantMembershipId: string): Observable<MemberRolesDto> {
    return this.http
      .get<ApiResponse<MemberRolesDto>>(API_ROUTES.membershipRoles(tenantMembershipId), {
        withCredentials: true,
      })
      .pipe(map(unwrap));
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
      .pipe(map(unwrap));
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
      .pipe(map(unwrap));
  }
}

@Service()
export class TeamsApi {
  private readonly http = inject(HttpClient);

  tree(): Observable<TeamNode[]> {
    return this.http
      .get<ApiResponse<TeamNode[] | null>>(API_ROUTES.teamsTree, { withCredentials: true })
      .pipe(map((response) => response.data ?? []));
  }
}

@Service()
export class TenantApi {
  private readonly http = inject(HttpClient);

  get(): Observable<TenantDto> {
    return this.http
      .get<ApiResponse<TenantMeResponseWire>>(API_ROUTES.tenant, { withCredentials: true })
      .pipe(
        map(unwrap),
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
        map(unwrap),
        map((page) => page.items ?? []),
      );
  }

  startFreeTrial(packageId: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(API_ROUTES.freeTrial, { packageId }, { withCredentials: true })
      .pipe(map(unwrap));
  }
}
