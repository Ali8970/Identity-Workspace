import { Service, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { PERMISSIONS } from '@core/auth/permission-keys';
import { MembersApi } from '@domains/access/services/members-api.service';
import { PermissionsApi } from '@domains/access/services/permissions-api.service';
import { RolesApi } from '@domains/access/services/roles-api.service';
import { SessionStore } from '@core/auth/session.store';
import { RoleGrantScope } from '@domains/access/models/grant-scope.model';
import {
  CreateRoleRequest,
  MemberListItem,
  PermissionCatalogItem,
  RoleListItem,
  RoleMembershipsDto,
  RolePermissionsDto,
  UpdateRoleRequest,
} from '@domains/access/models/access.model';

@Service()
export class RolesService {
  private readonly rolesApi = inject(RolesApi);
  private readonly permissionsApi = inject(PermissionsApi);
  private readonly membersApi = inject(MembersApi);
  private readonly session = inject(SessionStore);

  canReadMembers(): boolean {
    return this.session.hasPermission(PERMISSIONS.membershipsRead);
  }

  canReadPermissions(): boolean {
    return this.session.hasPermission(PERMISSIONS.permissionsRead);
  }

  canManageRoles(): boolean {
    return this.session.hasPermission(PERMISSIONS.rolesManage);
  }

  isProtected(role: RoleListItem): boolean {
    return role.isSystem || role.isOwnerRole;
  }

  /** Roles of the company the session is bound to; optionally one application. */
  listForCurrentTenant(applicationKey?: string): Observable<RoleListItem[]> {
    return this.rolesApi.list(applicationKey);
  }

  loadRolesAndPermissionCatalog(): Observable<{
    roles: RoleListItem[];
    permissions: PermissionCatalogItem[];
  }> {
    return forkJoin({
      roles: this.rolesApi.list(),
      permissions: this.canReadPermissions()
        ? this.permissionsApi.catalog()
        : of([] as PermissionCatalogItem[]),
    });
  }

  roleMemberships(roleId: string): Observable<RoleMembershipsDto> {
    return this.rolesApi.memberships(roleId);
  }

  rolePermissions(roleId: string): Observable<RolePermissionsDto> {
    return this.rolesApi.permissions(roleId);
  }

  loadMembers(): Observable<MemberListItem[]> {
    return this.membersApi.list();
  }

  offeredKeys(catalog: PermissionCatalogItem[], applicationKey: string): Set<string> {
    return new Set(
      catalog
        .filter((item) => item.isActive && item.applicationKeys.includes(applicationKey))
        .map((item) => item.key),
    );
  }

  grantableKeys(
    scope: RoleGrantScope,
    applicationKey: string,
    offered: Iterable<string>,
  ): Set<string> {
    const held = scope.keysByApplication.get(applicationKey) ?? new Set<string>();
    return new Set([...offered].filter((key) => scope.isOwner || held.has(key)));
  }

  createRole(request: CreateRoleRequest): Observable<RoleListItem> {
    return this.rolesApi.create(request);
  }

  updateRole(roleId: string, request: UpdateRoleRequest): Observable<RoleListItem> {
    return this.rolesApi.update(roleId, request);
  }

  setRolePermissions(roleId: string, permissionKeys: string[]): Observable<RolePermissionsDto> {
    return this.rolesApi.setPermissions(roleId, permissionKeys);
  }
}
