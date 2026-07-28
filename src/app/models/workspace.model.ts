/** Wire DTOs for workspace / tenant APIs (OpenAPI-shaped). */

export interface MemberListItem {
  tenantMembershipId: string;
  userId: string;
  email: string;
  nameAr: string;
  nameEn: string;
  status: string;
  isOwner: boolean;
  roles: { id: string; code: string; nameAr: string; nameEn: string }[];
}

export interface AddMemberRequest {
  email: string;
  arabicName: string;
  englishName: string;
  roleIds?: string[];
}

export interface AddMemberResult {
  tenantMembershipId: string;
  userId: string;
  tenantId: string;
  email: string;
  userAlreadyExisted: boolean;
  requiresPasswordSetup: boolean;
  emailType: string;
  isNewUser: boolean;
  tenantMembershipStatus: string;
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

export interface TeamNode {
  id: string;
  nameAr: string;
  nameEn: string;
  parentId: string | null;
  children: TeamNode[];
}

export interface PackageDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

export interface TenantDto {
  tenantId: string;
  arabicCompanyName: string;
  englishCompanyName: string;
  status: string;
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
