import { isSafeReturnUrl } from './error.model';

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
