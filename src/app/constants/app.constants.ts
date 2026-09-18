export const HTTP_HEADERS = {
  application: 'X-Brooch-Application',
  csrf: 'X-XSRF-TOKEN',
  acceptLanguage: 'Accept-Language',
  correlationId: 'X-Correlation-Id',
  devClient: 'X-Brooch-Dev-Client',
} as const;

export const APP_KEY = 'account' as const;

export const STORAGE_KEYS = {
  intentId: 'brooch.auth.intentId',
  language: 'brooch.lang',
  theme: 'brooch.theme',
} as const;

export const PERMISSIONS = {
  membershipsRead: 'identity.memberships.read',
  membershipsManage: 'identity.memberships.manage',
  rolesRead: 'identity.roles.read',
  rolesManage: 'identity.roles.manage',
  permissionsRead: 'identity.permissions.read',
  teamsRead: 'tenant.teams.read',
  teamsManage: 'tenant.teams.manage',
} as const;
