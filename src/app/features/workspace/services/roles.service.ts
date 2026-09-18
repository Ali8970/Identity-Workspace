import { Service, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { PERMISSIONS } from '../../../constants/app.constants';
import { MembersApi, PermissionsApi, RolesApi } from '../../../core/api/workspace-api.service';
import { MeApi } from '../../../core/auth/me-api.service';
import { SessionStore } from '../../../core/auth/session.store';
import {
  CreateRoleRequest,
  MemberListItem,
  PermissionCatalogItem,
  RoleListItem,
  RoleMembershipsDto,
  RolePermissionsDto,
  UpdateRoleRequest,
} from '../models/workspace-feature.model';

export interface RoleGrantScope {
  isOwner: boolean;
  keysByApplication: ReadonlyMap<string, ReadonlySet<string>>;
}

@Service()
export class RolesService {
  private readonly rolesApi = inject(RolesApi);
  private readonly permissionsApi = inject(PermissionsApi);
  private readonly membersApi = inject(MembersApi);
  private readonly meApi = inject(MeApi);
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

  loadGrantScope(): Observable<RoleGrantScope> {
    return this.meApi.access().pipe(
      map((access) => {
        const keysByApplication = new Map<string, Set<string>>();
        for (const role of access.roles) {
          const keys = keysByApplication.get(role.application.code) ?? new Set<string>();
          for (const key of role.permissionKeys ?? []) {
            keys.add(key);
          }
          keysByApplication.set(role.application.code, keys);
        }
        return { isOwner: access.isOwner, keysByApplication };
      }),
    );
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
