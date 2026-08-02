import { TenantMemberAccessEmailType, TenantMembershipStatus } from '../enums/domain.enums';

/** Wire DTOs for workspace / tenant APIs (OpenAPI-shaped). */

/**
 * /me DTOs the workspace pages also render. They are defined next to the other
 * /me contracts in auth.model.ts and surfaced here so feature code has one import.
 */
export type {
  MyAccessResponse,
  MyAccessRoleDto,
  MyAccessTeamDto,
  SessionDto,
} from './auth.model';

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
  isOwner: boolean;
  isPrimary: boolean;
  jobTitle: string | null;
  roles: TenantMemberRoleDto[];
  applicationKeys: string[];
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
  /** Inactive roles cannot be assigned. */
  isActive: boolean;
  permissionKeys: string[];
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
 * application (identity, crm, administration); one with no roles maps to [].
 */
export interface MemberRolesDto {
  tenantMembershipId: string;
  roles: RoleListItem[];
  effectivePermissionsByApplication: Record<string, string[]>;
}

/** GET /teams/tree — TeamNodeDto */
export interface TeamNode {
  id: string;
  name: string;
  managerTenantMembershipId: string | null;
  isMissingManager: boolean;
  memberCount: number;
  children: TeamNode[];
}

/** Localized label used by DDL endpoints (`title.ar` / `title.en`). */
export interface LocalizedTitle {
  ar: string;
  en: string;
}

/** GET /teams/{teamId}/memberships/ddl */
export interface TeamMembershipDdlItem {
  id: string;
  title: LocalizedTitle;
}

/** PUT /teams/{teamId}/manager */
export interface SetTeamManagerRequest {
  managerTenantMembershipId: string | null;
}

/** PUT /teams/{teamId}/manager — response data */
export interface TeamDetailDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  parentTeamId: string | null;
  managerTenantMembershipId: string | null;
  isMissingManager: boolean;
  status: string;
  memberCount: number;
  version: number;
}

/** GET /packages — PackageResponse. Descriptions are nullable. */
export interface PackageDto {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isEmpty: boolean;
  itemsCount: number;
}

/**
 * GET /tenant — TenantMeResponse as it comes off the wire.
 *
 * `tenantId` is the one place in the whole API that leaks a strongly-typed id
 * wrapper (`{ value }`) instead of a bare uuid, so it is modelled permissively
 * and normalised by TenantApi.get(). See `readTenantId`.
 */
export interface TenantMeResponseWire {
  tenantId: string | { value: string };
  code: string;
  email: string;
  status: string;
  onboardingState: string;
  onboardingCompleted: boolean;
  companyNameAr: string | null;
  companyNameEn: string | null;
  phone: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  activatedAt: string | null;
  onboardingCompletedAt: string | null;
}

/** Accepts both the wrapped and the bare form so either serialisation works. */
export function readTenantId(value: string | { value: string }): string {
  return typeof value === 'string' ? value : value.value;
}

/** Mapped view of GET /tenant for onboarding forms. */
export interface TenantDto {
  tenantId: string;
  companyNameAr: string | null;
  companyNameEn: string | null;
  status: string;
  onboardingState?: string;
  onboardingCompleted?: boolean;
}

/** PUT /tenant/profile — phone is accepted alongside the company names. */
export interface UpdateTenantProfileRequest {
  companyNameAr?: string | null;
  companyNameEn?: string | null;
  phone?: string | null;
}

