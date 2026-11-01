import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ACCESS_ENDPOINTS } from '../constants/access.endpoints';
import {
  CreateRoleRequest,
  RoleListItem,
  RoleMembershipsDto,
  RolePermissionsDto,
  UpdateRoleRequest,
} from '../models/access.model';
import { apiData, unwrapData } from '@core/http/unwrap';
import { toParams } from '@core/http/http-params';
import { ApiResponse } from '@shared/models/api-response.model';

/** Roles defined in the current company, optionally narrowed to one application. */
/**
 * `permissionKeys` is declared non-nullable, so make that true here rather than defending
 * against null in every consumer.
 */
function withPermissionKeys(roles: RoleListItem[]): RoleListItem[] {
  return roles.map((role) => ({ ...role, permissionKeys: role.permissionKeys ?? [] }));
}

@Service()
export class RolesApi {
  private readonly http = inject(HttpClient);

  /**
   * GET /roles (every application) as a resource, re-read whenever `scope()` changes and idle
   * while it is undefined. Same normalisation as `list()`.
   */
  listResource(scope: () => string | undefined) {
    return httpResource<RoleListItem[]>(
      () => (scope() === undefined ? undefined : { url: ACCESS_ENDPOINTS.roles, withCredentials: true }),
      { parse: (body) => withPermissionKeys(apiData<RoleListItem[]>(body)), defaultValue: [] },
    );
  }

  list(applicationKey?: string): Observable<RoleListItem[]> {
    return this.http
      .get<ApiResponse<RoleListItem[]>>(ACCESS_ENDPOINTS.roles, {
        withCredentials: true,
        params: toParams({ applicationKey }),
      })
      .pipe(
        unwrapData(),
        map(withPermissionKeys),
      );
  }

  get(roleId: string): Observable<RoleListItem> {
    return this.http
      .get<ApiResponse<RoleListItem>>(ACCESS_ENDPOINTS.role(roleId), { withCredentials: true })
      .pipe(unwrapData());
  }

  permissions(roleId: string): Observable<RolePermissionsDto> {
    return this.http
      .get<ApiResponse<RolePermissionsDto>>(ACCESS_ENDPOINTS.rolePermissions(roleId), {
        withCredentials: true,
      })
      .pipe(
        unwrapData(),
        map((dto) => ({
          ...dto,
          permissionKeys: dto.permissionKeys ?? [],
          availablePermissionKeys: dto.availablePermissionKeys ?? [],
        })),
      );
  }

  create(request: CreateRoleRequest): Observable<RoleListItem> {
    return this.http
      .post<ApiResponse<RoleListItem>>(ACCESS_ENDPOINTS.roles, request, { withCredentials: true })
      .pipe(
        unwrapData(),
        map((role) => ({ ...role, permissionKeys: role.permissionKeys ?? [] })),
      );
  }

  update(roleId: string, request: UpdateRoleRequest): Observable<RoleListItem> {
    return this.http
      .put<ApiResponse<RoleListItem>>(ACCESS_ENDPOINTS.role(roleId), request, {
        withCredentials: true,
      })
      .pipe(
        unwrapData(),
        map((role) => ({ ...role, permissionKeys: role.permissionKeys ?? [] })),
      );
  }

  setPermissions(roleId: string, permissionKeys: string[]): Observable<RolePermissionsDto> {
    return this.http
      .put<ApiResponse<RolePermissionsDto>>(
        ACCESS_ENDPOINTS.rolePermissions(roleId),
        { permissionKeys },
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  memberships(roleId: string): Observable<RoleMembershipsDto> {
    return this.http
      .get<ApiResponse<RoleMembershipsDto>>(ACCESS_ENDPOINTS.roleMemberships(roleId), {
        withCredentials: true,
      })
      .pipe(
        unwrapData(),
        map((dto) => ({ ...dto, tenantMembershipIds: dto.tenantMembershipIds ?? [] })),
      );
  }
}
