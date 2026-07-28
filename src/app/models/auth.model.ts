import { MembershipStatus, TenantStatus, UserStatus } from '../enums/domain.enums';

export interface LoginRequest {
  email: string;
  password: string;
  intentId?: string | null;
}

export interface AvailableTenantDto {
  tenantMembershipId: string;
  tenantId: string;
  companyNameAr: string;
  companyNameEn: string;
  status: string;
  isOwner: boolean;
  hasActiveSubscription: boolean;
}

export interface LoginResponse {
  availableCompanies: AvailableTenantDto[];
  requiresTenantSelection: boolean;
  redirectUrl: string | null;
}

export interface SelectMembershipRequest {
  tenantMembershipId: string;
  intentId?: string | null;
}

export interface SelectMembershipResponse {
  redirectUrl: string | null;
}

export interface SetPasswordRequest {
  userId: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface SetPasswordResponse {
  userId: string;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface CompleteForgotPasswordRequest {
  userId: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateLoginIntentRequest {
  applicationKey: string;
  returnUrl: string;
  action?: string;
}

export interface CreateIntentResultDto {
  isValid: boolean;
  intentId: string | null;
  applicationKey: string | null;
  normalizedReturnUrl: string | null;
  reason: string | null;
}

export interface RegisterTenantRequest {
  arabicCompanyName?: string | null;
  englishCompanyName?: string | null;
  managerEmail: string;
  firstName: string;
  lastName: string;
}

export interface RegisterTenantResult {
  tenantId: string;
  userId: string;
  isNewUser: boolean;
  emailAlreadyRegistered: boolean;
  requiresPasswordSetup: boolean;
  messageKey: string | null;
}

export interface CurrentUserDto {
  id: string;
  email: string;
  nameAr: string;
  nameEn: string;
  status: keyof typeof UserStatus | string;
}

export interface CurrentApplicationDto {
  key: string;
  nameAr: string;
  nameEn: string;
  baseUrl: string;
}

export interface CurrentTenantDto {
  tenantId: string;
  tenantMembershipId: string;
  nameAr: string;
  nameEn: string;
  jobTitle: string | null;
  isPrimary: boolean;
  isOwner: boolean;
  tenantStatus?: TenantStatus | string;
}

export interface RoleDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface AvailableApplicationDto {
  key: string;
  nameAr: string;
  nameEn: string;
  baseUrl: string;
  isCurrent: boolean;
  isEligible?: boolean;
  isActive?: boolean;
}

export interface CurrentUserResponse {
  user: CurrentUserDto;
  currentApplication: CurrentApplicationDto;
  currentTenant: CurrentTenantDto | null;
  teams: { id: string; nameAr: string; nameEn: string }[];
  roles: RoleDto[];
  permissions: string[];
  availableApplications: AvailableApplicationDto[];
}

export interface MyCompanyDto {
  tenantMembershipId: string;
  tenantId: string;
  companyNameAr: string;
  companyNameEn: string;
  tenantMembershipStatus: keyof typeof MembershipStatus | string;
  isOwner: boolean;
  isPrimary: boolean;
  jobTitle: string | null;
  tenantStatus: TenantStatus | string;
  isSelectable: boolean;
  unavailableReason: string | null;
  isCurrent: boolean;
  hasActiveSubscription: boolean;
}

export interface CsrfTokenResponse {
  token: string;
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
}

export interface UpdateProfileRequest {
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
}
