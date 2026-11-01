import { TenantMemberAccessEmailType } from '../enums/access.enums';
import { BroochUserStatus, TenantMembershipStatus } from '@core/auth/auth.enums';

export interface TenantMemberRoleDto {
  roleId: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/** GET /memberships — TenantMemberDto */
export interface MemberListItem {
  tenantMembershipId: string;
  userId: string;
  email: string;
  arabicName: string;
  englishName: string;
  tenantMembershipStatus: TenantMembershipStatus | string;
  userStatus: BroochUserStatus | string;
  isOwner: boolean;
  isPrimary: boolean;
  jobTitle: string | null;
  roles: TenantMemberRoleDto[];
  applicationKeys: string[];
}

export interface ResendActivationResult {
  tenantMembershipId: string;
  userId: string;
  email: string;
  reusedExistingToken: boolean;
  expiresAtUtc: string;
}

/**
 * POST /memberships — CreateMembershipRequest.
 * roleIds must carry at least one entry; the server rejects an empty set.
 */
export interface AddMemberRequest {
  email: string;
  arabicName: string | null;
  englishName: string | null;
  roleIds: string[];
  teamIds: string[] | null;
}

export interface AddMemberResult {
  tenantMembershipId: string;
  userId: string;
  tenantId: string;
  email: string;
  userAlreadyExisted: boolean;
  requiresPasswordSetup: boolean;
  emailType: TenantMemberAccessEmailType | string;
  isNewUser: boolean;
  tenantMembershipStatus: TenantMembershipStatus | string;
}

/** GET /roles — RoleDto. A role belongs to exactly one application. */
export interface RoleListItem {
  id: string;
  tenantId: string;
  applicationKey: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  /** Seeded catalogue role — immutable through the API. */
  isSystem: boolean;
  isOwnerRole: boolean;
  /** Inactive roles cannot be assigned. */
  isActive: boolean;
  permissionKeys: string[];
}

export interface CreateRoleRequest {
  applicationKey: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  permissionKeys: string[];
}

export interface UpdateRoleRequest {
  nameAr: string;
  nameEn: string;
  description: string | null;
  isActive: boolean;
}

export interface RolePermissionsDto {
  roleId: string;
  applicationKey: string;
  permissionKeys: string[];
  availablePermissionKeys: string[];
}

export interface RoleMembershipsDto {
  roleId: string;
  tenantMembershipIds: string[];
}

/**
 * GET /permissions — PermissionDto.
 * Permissions are global definitions: `applicationKeys` lists the applications
 * allowed to OFFER the key, and grouping is derived client-side from
 * module / resource / action.
 */
export interface PermissionCatalogItem {
  key: string;
  module: string;
  resource: string;
  action: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  applicationKeys: string[];
}

/**
 * GET|PUT /memberships/{id}/roles — MemberRolesDto.
 * effectivePermissionsByApplication carries an entry for every role-owning
 * application (account, crm, administration); one with no roles maps to [].
 */
export interface MemberRolesDto {
  tenantMembershipId: string;
  roles: RoleListItem[];
  effectivePermissionsByApplication: Record<string, string[]>;
}

export interface MemberListFilters {
  search?: string;
  status?: TenantMembershipStatus;
}
