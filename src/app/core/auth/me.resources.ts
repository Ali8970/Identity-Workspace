import { httpResource } from '@angular/common/http';
import { apiData } from '../http/unwrap';
import { AUTH_ENDPOINTS } from './auth.endpoints';
import { MyAccessResponse, MyCompanyDto, SessionDto } from './auth.model';

/*
 * /me reads as httpResources. Kept out of MeApi on purpose: MeApi is loaded at boot by
 * SessionStore, and these are only used by lazy pages, so httpResource stays out of the
 * initial bundle. Call from an injection context (a field initializer). Each read is idle while
 * `scope()` is undefined and re-read whenever it changes (e.g. a company switch).
 */

export function myAccessResource(scope: () => string | undefined) {
  return httpResource<MyAccessResponse>(
    () => (scope() === undefined ? undefined : { url: AUTH_ENDPOINTS.myAccess, withCredentials: true }),
    { parse: apiData<MyAccessResponse> },
  );
}

/** GET /me/companies with the server's default filtering. */
export function myCompaniesResource(scope: () => string | undefined) {
  return httpResource<MyCompanyDto[]>(
    () => (scope() === undefined ? undefined : { url: AUTH_ENDPOINTS.myCompanies, withCredentials: true }),
    { parse: apiData<MyCompanyDto[]>, defaultValue: [] },
  );
}

export function mySessionsResource(scope: () => string | undefined) {
  return httpResource<SessionDto[]>(
    () => (scope() === undefined ? undefined : { url: AUTH_ENDPOINTS.mySessions, withCredentials: true }),
    { parse: apiData<SessionDto[]>, defaultValue: [] },
  );
}
