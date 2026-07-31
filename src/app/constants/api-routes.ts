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
  membership: (tenantMembershipId: string) => `${base}/memberships/${tenantMembershipId}`,
  membershipRoles: (tenantMembershipId: string) =>
    `${base}/memberships/${tenantMembershipId}/roles`,

  // Roles — likewise scoped to the caller's company by the session.
  roles: `${base}/roles`,
  role: (roleId: string) => `${base}/roles/${roleId}`,
  rolePermissions: (roleId: string) => `${base}/roles/${roleId}/permissions`,

  // Platform catalogues
  applications: `${base}/applications`,
  permissions: `${base}/permissions`,

  // Tenant / onboarding
  registerTenant: `${base}/tenants/register`,
  tenant: `${base}/tenant`,
  tenantProfile: `${base}/tenant/profile`,
  packages: `${base}/packages`,
  freeTrial: `${base}/subscriptions/free-trial`,

  // Teams (Tenant module)
  teams: `${base}/teams`,
  teamsTree: `${base}/teams/tree`,
  teamMembershipsDdl: (teamId: string) => `${base}/teams/${teamId}/memberships/ddl`,
  teamManager: (teamId: string) => `${base}/teams/${teamId}/manager`,
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
