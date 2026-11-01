import { API_ROUTES, CSRF_EXEMPT_PATHS } from '../../constants/api-routes';
import { isApiRequest, isCsrfExemptRequest } from './api-url';

/** Every URL the app requests, parameterised routes filled with sample ids. */
const allApiUrls = Object.values(API_ROUTES).map((route) =>
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
        API_ROUTES.login,
        API_ROUTES.setPassword,
        API_ROUTES.forgotPassword,
        API_ROUTES.forgotPasswordComplete,
        API_ROUTES.loginIntent,
        API_ROUTES.csrf,
        API_ROUTES.registerTenant,
      ].sort(),
    );
  });

  it('ignores the query string', () => {
    expect(isCsrfExemptRequest(`${API_ROUTES.login}?x=1`)).toBe(true);
  });

  it('never treats a foreign URL containing /api/ as a Brooch API call', () => {
    expect(isApiRequest('https://evil.test/api/v1/memberships')).toBe(false);
    expect(isApiRequest('https://api.moyasar.com/v1/tokens')).toBe(false);
    expect(isApiRequest('/i18n/en.json')).toBe(false);
  });

  it('does not exempt a future endpoint that merely contains an exempt path', () => {
    expect(isCsrfExemptRequest(`${API_ROUTES.login}-history`)).toBe(false);
    expect(isCsrfExemptRequest(`${API_ROUTES.csrf}/rotate`)).toBe(false);
  });
});
