import {
  BroochUserStatus,
  CompanyUnavailableReason,
  TenantMembershipStatus,
  TenantStatus,
} from '../enums/domain.enums';

export interface LoginRequest {
  email: string;
  password: string;
  intentId?: string | null;
}

export interface AvailableTenantDto {
  tenantMembershipId: string;
  tenantId: string;
  /** Company short code from the Tenant module. */
  code: string;
  companyNameAr: string;
  companyNameEn: string;
  status: TenantStatus | string;
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
  action?: string | null;
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
  firstName?: string | null;
  lastName?: string | null;
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
  status: BroochUserStatus | string;
}

export interface CurrentApplicationDto {
  key: string;
  nameAr: string;
  nameEn: string;
  baseUrl: string | null;
}

export interface CurrentTenantDto {
  tenantId: string;
  tenantMembershipId: string;
  nameAr: string;
  nameEn: string;
  jobTitle: string | null;
  isPrimary: boolean;
  isOwner: boolean;
}

/** GET /me — roles filtered to the current application. */
export interface CurrentRoleDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/** GET /me — team membership from the Tenant module. */
export interface CurrentTeamDto {
  teamId: string;
  name: string;
  isPrimary: boolean;
}

export interface AvailableApplicationDto {
  key: string;
  nameAr: string;
  nameEn: string;
  baseUrl: string | null;
  isCurrent: boolean;
}

export interface CurrentUserResponse {
  user: CurrentUserDto;
  currentApplication: CurrentApplicationDto;
  /** Null for a Selection-stage session (the company-picker bootstrap). */
  currentTenant: CurrentTenantDto | null;
  teams: CurrentTeamDto[];
  roles: CurrentRoleDto[];
  /** Effective permission keys for this membership in the current application. */
  permissions: string[];
  availableApplications: AvailableApplicationDto[];
}

/** GET /me/companies — MyTenantDto */
export interface MyCompanyDto {
  tenantMembershipId: string;
  tenantId: string;
  /** Company short code from the Tenant module. */
  code: string;
  companyNameAr: string;
  companyNameEn: string;
  tenantMembershipStatus: TenantMembershipStatus | string;
  isOwner: boolean;
  isPrimary: boolean;
  jobTitle: string | null;
  tenantStatus: TenantStatus | string;
  isSelectable: boolean;
  unavailableReason: CompanyUnavailableReason | string | null;
  isCurrent: boolean;
}

export interface CsrfTokenResponse {
  token: string;
}

/** One row of GET /me/profile — the caller's job title in a company they belong to. */
export interface TenantTitleDto {
  tenantMembershipId: string;
  companyNameAr: string;
  companyNameEn: string;
  jobTitle: string | null;
  displayTitle: string | null;
}

/**
 * GET|PUT /me/profile — ProfileDto.
 * The account has a single bilingual display name; there is no first/last split.
 */
export interface ProfileDto {
  userId: string;
  displayNameAr: string;
  displayNameEn: string;
  email: string | null;
  identityNumber: string | null;
  phone: string | null;
  /** "ar" | "en" — defaults to "ar" when unset. */
  preferredLanguage: string;
  accountStatus: BroochUserStatus | string;
  tenantTitles: TenantTitleDto[];
}

export interface TenantTitleUpdateDto {
  tenantMembershipId: string;
  jobTitle: string | null;
  displayTitle: string | null;
}

/** PUT /me/profile. Every listed membership must belong to the caller. */
export interface UpdateProfileRequest {
  displayNameAr: string;
  displayNameEn: string;
  phone: string | null;
  /** "ar" or "en". Omitted/null leaves the stored preference unchanged. */
  preferredLanguage: string | null;
  tenantTitles: TenantTitleUpdateDto[] | null;
}

/** GET /me/sessions — SessionDto. Addressed by the opaque sessionRef, never the session id. */
export interface SessionDto {
  sessionRef: string;
  stage: string;
  isCurrent: boolean;
  userAgent: string | null;
  ip: string | null;
  issuedAt: string;
  lastSeenAt: string;
  absoluteExpiresAt: string;
}

/** GET /me/access — one role the caller holds, with its owning application. */
export interface MyAccessRoleDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isSystem: boolean;
  /** id and code are both the application key. */
  application: { id: string; code: string; nameAr: string; nameEn: string };
  permissionKeys: string[];
}

export interface MyAccessTeamDto {
  id: string;
  name: string;
  parentTeamId: string | null;
  parentTeamName: string | null;
  isManager: boolean;
}

/**
 * GET /me/access — MyAccessResponse.
 * Not filtered by X-Brooch-Application: shows roles across every application
 * in the current company. There is no flat permission array — permissions are
 * carried per role in permissionKeys.
 */
export interface MyAccessResponse {
  isOwner: boolean;
  roles: MyAccessRoleDto[];
  teams: MyAccessTeamDto[];
  summary: {
    rolesCount: number;
    permissionsCount: number;
    teamsCount: number;
  };
}
