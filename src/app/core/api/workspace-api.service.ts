import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { ApiResponse } from '../../models/api-response.model';
import {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
  PackageDto,
  PermissionCatalogItem,
  RoleListItem,
  TeamNode,
  TenantDto,
} from '../../models/workspace.model';

export type {
  AddMemberRequest,
  AddMemberResult,
  MemberListItem,
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

@Service()
export class MembersApi {
  private readonly http = inject(HttpClient);

  list(tenantId: string): Observable<MemberListItem[]> {
    return this.http
      .get<ApiResponse<MemberListItem[]>>(API_ROUTES.members(tenantId), { withCredentials: true })
      .pipe(map(unwrap));
  }

  add(tenantId: string, request: AddMemberRequest): Observable<AddMemberResult> {
    return this.http
      .post<ApiResponse<AddMemberResult>>(API_ROUTES.members(tenantId), request, {
        withCredentials: true,
      })
      .pipe(map(unwrap));
  }

  updateRoles(
    tenantId: string,
    membershipId: string,
    roleIds: string[],
  ): Observable<unknown> {
    return this.http
      .put<ApiResponse<unknown>>(API_ROUTES.memberRoles(tenantId, membershipId), { roleIds }, {
        withCredentials: true,
      })
      .pipe(map(unwrap));
  }
}

@Service()
export class RolesApi {
  private readonly http = inject(HttpClient);

  list(tenantId: string): Observable<RoleListItem[]> {
    return this.http
      .get<ApiResponse<RoleListItem[]>>(API_ROUTES.roles(tenantId), { withCredentials: true })
      .pipe(map(unwrap));
  }
}

@Service()
export class PermissionsApi {
  private readonly http = inject(HttpClient);

  catalog(): Observable<PermissionCatalogItem[]> {
    return this.http
      .get<ApiResponse<PermissionCatalogItem[]>>(API_ROUTES.permissions, { withCredentials: true })
      .pipe(map(unwrap));
  }
}

@Service()
export class TeamsApi {
  private readonly http = inject(HttpClient);

  tree(): Observable<TeamNode[]> {
    return this.http
      .get<ApiResponse<TeamNode[]>>(API_ROUTES.teamsTree, { withCredentials: true })
      .pipe(map(unwrap));
  }
}

@Service()
export class TenantApi {
  private readonly http = inject(HttpClient);

  get(): Observable<TenantDto> {
    return this.http
      .get<
        ApiResponse<{
          tenantId: string;
          companyNameAr: string | null;
          companyNameEn: string | null;
          status: string;
          onboardingState?: string;
          onboardingCompleted?: boolean;
        }>
      >(API_ROUTES.tenant, { withCredentials: true })
      .pipe(
        map(unwrap),
        map((tenant) => ({
          tenantId: tenant.tenantId,
          companyNameAr: tenant.companyNameAr,
          companyNameEn: tenant.companyNameEn,
          status: tenant.status,
          onboardingState: tenant.onboardingState,
          onboardingCompleted: tenant.onboardingCompleted,
        })),
      );
  }

  updateProfile(request: {
    companyNameAr: string | null;
    companyNameEn: string | null;
  }): Observable<TenantDto> {
    return this.http
      .put<
        ApiResponse<{
          tenantId: string;
          companyNameAr: string | null;
          companyNameEn: string | null;
          status: string;
          onboardingState?: string;
          onboardingCompleted?: boolean;
        }>
      >(API_ROUTES.tenantProfile, request, { withCredentials: true })
      .pipe(
        map(unwrap),
        map((tenant) => ({
          tenantId: tenant.tenantId,
          companyNameAr: tenant.companyNameAr,
          companyNameEn: tenant.companyNameEn,
          status: tenant.status,
          onboardingState: tenant.onboardingState,
          onboardingCompleted: tenant.onboardingCompleted,
        })),
      );
  }

  packages(): Observable<PackageDto[]> {
    return this.http
      .get<ApiResponse<PackageDto[]>>(API_ROUTES.packages, { withCredentials: true })
      .pipe(map(unwrap));
  }

  startFreeTrial(packageId: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(
        API_ROUTES.freeTrial,
        { packageId },
        { withCredentials: true },
      )
      .pipe(map(unwrap));
  }
}
