export interface AddTenantMemberRequest {
  email: string;
  arabicName: string;
  englishName: string;
  roleIds?: string[];
  teamIds?: string[];
}

export interface AddTenantMemberResponse {
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

export interface TenantMemberDto {
  tenantMembershipId: string;
  userId: string;
  email: string;
  nameAr: string;
  nameEn: string;
  status: string;
  isOwner: boolean;
  roles: { id: string; code: string; nameAr: string; nameEn: string }[];
}

export interface PermissionDto {
  key: string;
  nameAr: string;
  nameEn: string;
  applicationKey: string;
  group?: string;
}

export interface PackageDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface TeamDto {
  id: string;
  nameAr: string;
  nameEn: string;
  parentTeamId: string | null;
  managerMembershipId: string | null;
  memberCount: number;
}

export interface TenantProfileDto {
  tenantId: string;
  arabicCompanyName: string;
  englishCompanyName: string;
  status: string;
}
