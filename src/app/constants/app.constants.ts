export const HTTP_HEADERS = {
  application: 'X-Brooch-Application',
  csrf: 'X-XSRF-TOKEN',
  acceptLanguage: 'Accept-Language',
  correlationId: 'X-Correlation-Id',
} as const;

export const APP_KEY = 'identity' as const;

export const STORAGE_KEYS = {
  intentId: 'brooch.auth.intentId',
  language: 'brooch.lang',
} as const;

export const PERMISSIONS = {
  membershipsManage: 'identity.memberships.manage',
  rolesRead: 'identity.roles.read',
  applicationsManage: 'identity.applications.manage',
  teamsRead: 'tenant.teams.read',
  teamsManage: 'tenant.teams.manage',
} as const;
