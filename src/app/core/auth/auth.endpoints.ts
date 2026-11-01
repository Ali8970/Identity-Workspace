import { API_BASE as base } from '../http/api-base';

/** Auth (public + session lifecycle) and the signed-in user's own view under /me. */
export const AUTH_ENDPOINTS = {
  csrf: `${base}/auth/csrf`,
  login: `${base}/auth/login`,
  selectMembership: `${base}/auth/select-membership`,
  setPassword: `${base}/auth/set-password`,
  forgotPassword: `${base}/auth/forgot-password`,
  forgotPasswordComplete: `${base}/auth/forgot-password/complete`,
  logout: `${base}/auth/logout`,
  logoutAll: `${base}/auth/logout-all`,
  loginIntent: `${base}/auth/login-intent`,
  registerTenant: `${base}/tenants/register`,

  // Me — effective permissions arrive inside GET /me; there is no separate permissions route.
  me: `${base}/me`,
  myProfile: `${base}/me/profile`,
  myCompanies: `${base}/me/companies`,
  myAccess: `${base}/me/access`,
  mySessions: `${base}/me/sessions`,
  mySession: (sessionRef: string) => `${base}/me/sessions/${sessionRef}`,
} as const;
