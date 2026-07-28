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
  usersCreate: 'identity.users.create',
  usersRead: 'identity.users.read',
  rolesRead: 'identity.roles.read',
  applicationsManage: 'identity.applications.manage',
} as const;
