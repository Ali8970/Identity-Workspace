import { API_BASE as base } from '@core/http/api-base';

/** Memberships, roles and the permission catalogue — company scope comes from the session. */
export const ACCESS_ENDPOINTS = {
  memberships: `${base}/memberships`,
  membershipsDdl: `${base}/memberships/ddl`,
  membership: (tenantMembershipId: string) => `${base}/memberships/${tenantMembershipId}`,
  membershipRoles: (tenantMembershipId: string) =>
    `${base}/memberships/${tenantMembershipId}/roles`,
  membershipResendActivation: (tenantMembershipId: string) =>
    `${base}/memberships/${tenantMembershipId}/resend-activation`,

  roles: `${base}/roles`,
  rolesDdl: `${base}/roles/ddl`,
  role: (roleId: string) => `${base}/roles/${roleId}`,
  rolePermissions: (roleId: string) => `${base}/roles/${roleId}/permissions`,
  roleMemberships: (roleId: string) => `${base}/roles/${roleId}/memberships`,

  permissions: `${base}/permissions`,
} as const;
