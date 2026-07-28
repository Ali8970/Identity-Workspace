import { environment } from '../../environments/environment';

const base = environment.apiBaseUrl.replace(/\/$/, '');

export const API_ROUTES = {
  csrf: `${base}/auth/csrf`,
  login: `${base}/auth/login`,
  selectMembership: `${base}/auth/select-membership`,
  setPassword: `${base}/auth/set-password`,
  forgotPassword: `${base}/auth/forgot-password`,
  forgotPasswordComplete: `${base}/auth/forgot-password/complete`,
  logout: `${base}/auth/logout`,
  logoutAll: `${base}/auth/logout-all`,
  me: `${base}/auth/me`,
  mePermissions: `${base}/auth/me/permissions`,
  loginIntent: `${base}/auth/login-intent`,
  myProfile: `${base}/me/profile`,
  myCompanies: `${base}/me/companies`,
  mySessions: `${base}/me/sessions`,
  myAccess: `${base}/me/access`,
  registerTenant: `${base}/tenants/register`,
  tenant: `${base}/tenant`,
  tenantProfile: `${base}/tenant/profile`,
  packages: `${base}/packages`,
  freeTrial: `${base}/subscriptions/free-trial`,
  applications: `${base}/applications`,
  permissions: `${base}/permissions`,
  companies: (tenantId: string) => `${base}/companies/${tenantId}`,
  members: (tenantId: string) => `${base}/companies/${tenantId}/members`,
  memberRoles: (tenantId: string, membershipId: string) =>
    `${base}/companies/${tenantId}/members/${membershipId}/roles`,
  roles: (tenantId: string) => `${base}/companies/${tenantId}/roles`,
  teams: `${base}/teams`,
  teamsTree: `${base}/teams/tree`,
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
