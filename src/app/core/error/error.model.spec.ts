import { isNavigableRedirect, isSafeReturnUrl } from './error.model';

describe('isNavigableRedirect', () => {
  it.each([
    'https://brooch.sa',
    'https://crm.brooch.sa/dashboard?x=1',
    'https://dev.crm.brooch.sa:4200/',
    'https://landlord.test.brooch.sa',
    // `ng serve` builds (environment.production === false) also trust local sibling apps.
    'http://localhost:4200/',
    'https://127.0.0.1:4300/',
  ])('follows %s', (url) => expect(isNavigableRedirect(url)).toBe(true));

  it.each([
    null,
    '',
    'not a url',
    'javascript:alert(1)',
    'http://crm.brooch.sa',
    'https://evil.test',
    'https://brooch.sa.evil.test',
    'https://evilbrooch.sa',
    'https://crm.brooch.sa@evil.test/',
    'https://user:pass@crm.brooch.sa/',
    'https://evil.test\\@crm.brooch.sa',
  ])('refuses %j', (url) => expect(isNavigableRedirect(url)).toBe(false));
});

describe('isSafeReturnUrl', () => {
  it.each(['/', '/members', '/roles?tab=permissions', '/onboarding/payment?operationId=op-1'])(
    'accepts the in-app path %s',
    (url) => expect(isSafeReturnUrl(url)).toBe(true),
  );

  it.each([
    null,
    '',
    'members',
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%09/evil.test'.replace('%09', '\t'),
    '/\n/evil.test',
    '/\u0000/evil.test',
  ])('rejects %j, which could leave the origin', (url) => {
    expect(isSafeReturnUrl(url)).toBe(false);
  });
});
