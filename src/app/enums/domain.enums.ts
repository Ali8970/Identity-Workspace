/** Wire enums — PascalCase strings (JsonStringEnumConverter). */

export type BroochUserStatus = 'Active' | 'Inactive' | 'Suspended' | 'PendingActivation';

export type TenantMembershipStatus = 'Active' | 'Suspended' | 'Removed';

export type TenantStatus = 'Onboarding' | 'Active' | 'Suspended' | 'Disabled';

/** OpenAPI TenantOnboardingState (includes provisioning steps). */
export type TenantOnboardingState =
  | 'Registered'
  | 'ProfileSaved'
  | 'SubscriptionActive'
  | 'CrmProvisioned'
  | 'TeamsProvisioned'
  | 'Completed';

export type ApplicationStatus = 'Draft' | 'Active' | 'Disabled' | 'Retired';

export type EligibilityReason =
  | 'Eligible'
  | 'UnknownApplication'
  | 'ApplicationDisabled'
  | 'ApplicationRetired'
  | 'UserInactive'
  | 'NoTenantMembership'
  | 'TenantMembershipSuspended'
  | 'TenantDisabled'
  | 'ApplicationRoleMissing'
  | 'SubscriptionInactive';

export type RemediationAction =
  | 'None'
  | 'ContactPlatformAdmin'
  | 'ContactSupport'
  | 'RequestAccessFromTenantAdmin'
  | 'ContactTenantOwner'
  | 'ContactBilling';

export type TenantMemberAccessEmailType = 'WelcomeBack' | 'SetPassword';

/** camelCase string codes on GET /me/companies when not selectable. */
export type CompanyUnavailableReason = 'tenantMembershipSuspended' | 'tenantDisabled';

export type ApplicationKey = 'identity' | 'crm' | 'hr' | 'administration';

/** SPA-only session stage (not on the wire). */
export enum SessionStage {
  Unknown = 'unknown',
  Anonymous = 'anonymous',
  Selection = 'selection',
  Active = 'active',
}

export const ONBOARDING_ORDER: TenantOnboardingState[] = [
  'Registered',
  'ProfileSaved',
  'SubscriptionActive',
  'CrmProvisioned',
  'TeamsProvisioned',
  'Completed',
];

export const REMEDIATION_BY_REASON: Record<EligibilityReason, RemediationAction> = {
  Eligible: 'None',
  UnknownApplication: 'ContactPlatformAdmin',
  ApplicationDisabled: 'ContactPlatformAdmin',
  ApplicationRetired: 'ContactPlatformAdmin',
  UserInactive: 'ContactSupport',
  NoTenantMembership: 'RequestAccessFromTenantAdmin',
  TenantMembershipSuspended: 'RequestAccessFromTenantAdmin',
  TenantDisabled: 'ContactTenantOwner',
  ApplicationRoleMissing: 'RequestAccessFromTenantAdmin',
  SubscriptionInactive: 'ContactBilling',
};
