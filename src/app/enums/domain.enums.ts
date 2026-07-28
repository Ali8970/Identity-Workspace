export enum UserStatus {
  Active = 1,
  Inactive = 2,
  Suspended = 3,
  PendingActivation = 4,
}

export enum MembershipStatus {
  Active = 1,
  Suspended = 2,
  Removed = 3,
}

export enum TenantStatus {
  Onboarding = 'Onboarding',
  Active = 'Active',
  Suspended = 'Suspended',
  Disabled = 'Disabled',
}

export enum SessionStage {
  Unknown = 'unknown',
  Anonymous = 'anonymous',
  Selection = 'selection',
  Active = 'active',
}

export enum ApplicationKey {
  Identity = 'identity',
  Crm = 'crm',
  Hr = 'hr',
  Administration = 'administration',
}

export enum EmailType {
  SetPassword = 'SetPassword',
  WelcomeBack = 'WelcomeBack',
}
