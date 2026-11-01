import { AUTH_ENDPOINTS } from '../auth/auth.endpoints';
// This spec proves every endpoint of every owner keeps its classification, so it reads all of them.
/* eslint-disable no-restricted-imports */
import { ACCESS_ENDPOINTS } from '@domains/access/constants/access.endpoints';
import { TEAM_ENDPOINTS } from '@domains/team/constants/team.endpoints';
import { ONBOARDING_ENDPOINTS } from '@features/onboarding/constants/onboarding.endpoints';
/* eslint-enable no-restricted-imports */
import { CSRF_EXEMPT_PATHS, isApiRequest, isCsrfExemptRequest } from './api-url';

/** Every URL the app requests, parameterised routes filled with sample ids. */
const allApiUrls = [AUTH_ENDPOINTS, ACCESS_ENDPOINTS, TEAM_ENDPOINTS, ONBOARDING_ENDPOINTS]
  .flatMap((endpoints) => Object.values(endpoints))
  .map((route) =>
    typeof route === 'function' ? (route as (...ids: string[]) => string)('id-1', 'id-2') : route,
  );

// The matchers this replaced, kept verbatim so the equivalence is proven route by route.
const legacyIsApi = (url: string) => url.includes('/api/');
const legacyCsrfExempt = (url: string) => CSRF_EXEMPT_PATHS.some((path) => url.includes(path));
const legacyPublicAuth = (url: string) =>
  CSRF_EXEMPT_PATHS.some((suffix) => url.split('?')[0].endsWith(suffix));

describe('api-url', () => {
  it.each(allApiUrls)('%s is an API request, exactly as before', (url) => {
    expect(isApiRequest(url)).toBe(true);
    expect(isApiRequest(url)).toBe(legacyIsApi(url));
  });

  it.each(allApiUrls)('%s keeps its CSRF exemption and public-auth classification', (url) => {
    expect(isCsrfExemptRequest(url)).toBe(legacyCsrfExempt(url));
    expect(isCsrfExemptRequest(url)).toBe(legacyPublicAuth(url));
  });

  it('exempts exactly the documented public auth endpoints', () => {
    expect(allApiUrls.filter(isCsrfExemptRequest).sort()).toEqual(
      [
        AUTH_ENDPOINTS.login,
        AUTH_ENDPOINTS.setPassword,
        AUTH_ENDPOINTS.forgotPassword,
        AUTH_ENDPOINTS.forgotPasswordComplete,
        AUTH_ENDPOINTS.loginIntent,
        AUTH_ENDPOINTS.csrf,
        AUTH_ENDPOINTS.registerTenant,
      ].sort(),
    );
  });

  it('ignores the query string', () => {
    expect(isCsrfExemptRequest(`${AUTH_ENDPOINTS.login}?x=1`)).toBe(true);
  });

  it('never treats a foreign URL containing /api/ as a Brooch API call', () => {
    expect(isApiRequest('https://evil.test/api/v1/memberships')).toBe(false);
    expect(isApiRequest('https://api.moyasar.com/v1/tokens')).toBe(false);
    expect(isApiRequest('/i18n/en.json')).toBe(false);
  });

  it('does not exempt a future endpoint that merely contains an exempt path', () => {
    expect(isCsrfExemptRequest(`${AUTH_ENDPOINTS.login}-history`)).toBe(false);
    expect(isCsrfExemptRequest(`${AUTH_ENDPOINTS.csrf}/rotate`)).toBe(false);
  });
});
