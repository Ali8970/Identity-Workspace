export const HTTP_HEADERS = {
  application: 'X-Brooch-Application',
  csrf: 'X-XSRF-TOKEN',
  acceptLanguage: 'Accept-Language',
  correlationId: 'X-Correlation-Id',
  devClient: 'X-Brooch-Dev-Client',
} as const;

export const APP_KEY = 'account' as const;
