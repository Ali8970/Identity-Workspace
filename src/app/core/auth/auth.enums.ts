/** Wire enums — PascalCase strings (JsonStringEnumConverter). */
export type BroochUserStatus = 'Active' | 'Inactive' | 'Suspended' | 'PendingActivation';

export type TenantMembershipStatus = 'Active' | 'Suspended' | 'Removed';

export type TenantStatus = 'Onboarding' | 'Active' | 'Suspended' | 'Disabled';

/** camelCase string codes on GET /me/companies when not selectable. */
export type CompanyUnavailableReason = 'tenantMembershipSuspended' | 'tenantDisabled';

/** SPA-only session stage (not on the wire). */
export enum SessionStage {
  Unknown = 'unknown',
  Anonymous = 'anonymous',
  Selection = 'selection',
  Active = 'active',
}
