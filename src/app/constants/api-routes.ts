import { environment } from '../../environments/environment';

const base = environment.apiBaseUrl.replace(/\/$/, '');

export const API_ROUTES = {
  // Auth — public + session lifecycle
  csrf: `${base}/auth/csrf`,
  login: `${base}/auth/login`,
  selectMembership: `${base}/auth/select-membership`,
  setPassword: `${base}/auth/set-password`,
  forgotPassword: `${base}/auth/forgot-password`,
  forgotPasswordComplete: `${base}/auth/forgot-password/complete`,
  logout: `${base}/auth/logout`,
  logoutAll: `${base}/auth/logout-all`,
  loginIntent: `${base}/auth/login-intent`,

  // Me — the signed-in user's own view. Effective permissions arrive inside
  // GET /me; there is no separate permissions route.
  me: `${base}/me`,
  myProfile: `${base}/me/profile`,
  myCompanies: `${base}/me/companies`,
  myAccess: `${base}/me/access`,
  mySessions: `${base}/me/sessions`,
  mySession: (sessionRef: string) => `${base}/me/sessions/${sessionRef}`,

  // Memberships — company scope comes from the session, not the URL.
  memberships: `${base}/memberships`,
  membershipsDdl: `${base}/memberships/ddl`,
  membership: (tenantMembershipId: string) => `${base}/memberships/${tenantMembershipId}`,
  membershipRoles: (tenantMembershipId: string) =>
    `${base}/memberships/${tenantMembershipId}/roles`,
  membershipResendActivation: (tenantMembershipId: string) =>
    `${base}/memberships/${tenantMembershipId}/resend-activation`,

  // Roles — likewise scoped to the caller's company by the session.
  roles: `${base}/roles`,
  rolesDdl: `${base}/roles/ddl`,
  role: (roleId: string) => `${base}/roles/${roleId}`,
  rolePermissions: (roleId: string) => `${base}/roles/${roleId}/permissions`,
  roleMemberships: (roleId: string) => `${base}/roles/${roleId}/memberships`,

  // Platform catalogues
  applications: `${base}/applications`,
  permissions: `${base}/permissions`,

  // Tenant / onboarding
  registerTenant: `${base}/tenants/register`,
  tenant: `${base}/tenant`,
  tenantProfile: `${base}/tenant/profile`,

  // Subscriptions — Subscription owns every tenant-facing payment route. Onboarding never
  // calls a /payments/* endpoint: that surface is read-only history and provider webhooks.
  availablePackages: `${base}/subscriptions/available-packages`,
  subscriptions: `${base}/subscriptions`,
  currentSubscription: `${base}/subscriptions/current`,
  subscriptionOperation: (operationId: string) =>
    `${base}/subscription-operations/${operationId}`,
  paySubscriptionOperation: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/pay`,
  verifySubscriptionPayment: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/payments/verify`,
  retrySubscriptionPayment: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/retry-payment`,
  retrySubscriptionProvisioning: (operationId: string) =>
    `${base}/subscription-operations/${operationId}/retry-provisioning`,

  // Teams (Tenant module)
  teams: `${base}/teams`,
  teamsTree: `${base}/teams/tree`,
  teamsMissingManager: `${base}/teams/missing-manager`,
  team: (teamId: string) => `${base}/teams/${teamId}`,
  teamMembershipsDdl: (teamId: string) => `${base}/teams/${teamId}/memberships/ddl`,
  teamManager: (teamId: string) => `${base}/teams/${teamId}/manager`,
  teamMembers: (teamId: string) => `${base}/teams/${teamId}/members`,
  teamMember: (teamId: string, membershipId: string) =>
    `${base}/teams/${teamId}/members/${membershipId}`,
} as const;

export const CSRF_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/set-password',
  '/auth/forgot-password',
  '/auth/forgot-password/complete',
  '/auth/login-intent',
  '/auth/csrf',
  '/tenants/register',
] as const;
