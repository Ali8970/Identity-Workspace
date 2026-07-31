import { TenantMemberAccessEmailType, TenantMembershipStatus } from '../enums/domain.enums';

/** Wire DTOs for workspace / tenant APIs (OpenAPI-shaped). */

export interface TenantMemberRoleDto {
  roleId: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/** GET /companies/{tenantId}/members — TenantMemberDto */
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

export interface AddMemberRequest {
  email: string;
  arabicName: string | null;
  englishName: string | null;
  roleIds?: string[] | null;
  teamIds?: string[] | null;
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

export interface RoleListItem {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  applicationKey: string;
  permissionKeys?: string[];
}

export interface PermissionCatalogItem {
  key: string;
  nameAr: string;
  nameEn: string;
  applicationKey: string;
  group: string;
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

export interface PackageDto {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  displayOrder?: number;
  isActive?: boolean;
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

/** Mapped view of GET /tenant for onboarding forms. */
export interface TenantDto {
  tenantId: string;
  companyNameAr: string | null;
  companyNameEn: string | null;
  status: string;
  onboardingState?: string;
  onboardingCompleted?: boolean;
}

export interface UpdateTenantProfileRequest {
  companyNameAr?: string | null;
  companyNameEn?: string | null;
}

export interface MyAccessDto {
  roles: { id: string; code: string; nameAr: string; nameEn: string }[];
  permissions: string[];
}

export interface SessionRowDto {
  id: string;
  stage: string;
}

/** @deprecated use AddMemberRequest */
export type AddTenantMemberRequest = AddMemberRequest;

/** @deprecated use AddMemberResult */
export type AddTenantMemberResponse = AddMemberResult;

/** @deprecated use MemberListItem */
export type TenantMemberDto = MemberListItem;

/** @deprecated use PermissionCatalogItem */
export type PermissionDto = PermissionCatalogItem;

/** @deprecated use TenantDto */
export type TenantProfileDto = TenantDto;

export interface TeamDto {
  id: string;
  nameAr: string;
  nameEn: string;
  parentTeamId: string | null;
  managerMembershipId: string | null;
  memberCount: number;
}
