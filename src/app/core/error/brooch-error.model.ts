export interface BroochError {
  status: number;
  code: string | null;
  message: string;
  messageKey: string | null;
  correlationId: string | null;
  redirectUrl: string | null;
  raw: unknown;
}

export function isApplicationAccessDenied(error: BroochError): boolean {
  return error.code === 'Auth.ApplicationAccessDenied';
}

export function isLoginIntentFailure(error: BroochError): boolean {
  return !!error.code?.startsWith('Identity.LoginIntent.');
}

export function isNavigableRedirect(url: string | null | undefined): url is string {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeReturnUrl(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//');
}
