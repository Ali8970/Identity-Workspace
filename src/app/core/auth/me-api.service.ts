import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AUTH_ENDPOINTS } from './auth.endpoints';
import { ApiResponse } from '@shared/models/api-response.model';
import { apiData, unwrapData } from '../http/unwrap';
import {
  CurrentUserResponse,
  MyAccessResponse,
  MyCompanyDto,
  ProfileDto,
  SessionDto,
  UpdateProfileRequest,
} from './auth.model';

@Service()
export class MeApi {
  private readonly http = inject(HttpClient);

  /**
   * Bootstrap call. Requires X-Brooch-Application (added by the interceptor) and
   * carries the effective permission set for that application — there is no
   * separate permissions endpoint.
   */
  me(): Observable<CurrentUserResponse> {
    return this.http
      .get<ApiResponse<CurrentUserResponse>>(AUTH_ENDPOINTS.me, { withCredentials: true })
      .pipe(unwrapData());
  }

  profile(): Observable<ProfileDto> {
    return this.http
      .get<ApiResponse<ProfileDto>>(AUTH_ENDPOINTS.myProfile, { withCredentials: true })
      .pipe(unwrapData());
  }

  /** Returns the freshly re-read profile — the handler re-runs GetProfileQuery. */
  updateProfile(request: UpdateProfileRequest): Observable<ProfileDto> {
    return this.http
      .put<ApiResponse<ProfileDto>>(AUTH_ENDPOINTS.myProfile, request, { withCredentials: true })
      .pipe(unwrapData());
  }

  /** includeUnavailable defaults to true server-side; pass false to drop non-selectable rows. */
  companies(includeUnavailable?: boolean): Observable<MyCompanyDto[]> {
    const params =
      includeUnavailable === undefined
        ? undefined
        : new HttpParams().set('includeUnavailable', includeUnavailable);
    return this.http
      .get<ApiResponse<MyCompanyDto[]>>(AUTH_ENDPOINTS.myCompanies, {
        withCredentials: true,
        params,
      })
      .pipe(unwrapData());
  }

  /** Active-stage only: roles across every application in the current company. */
  /**
   * GET /me/access as a resource, re-read whenever `scope()` changes (e.g. a company switch) and
   * idle while it is undefined.
   */
  accessResource(scope: () => string | undefined) {
    return httpResource<MyAccessResponse>(
      () => (scope() === undefined ? undefined : { url: AUTH_ENDPOINTS.myAccess, withCredentials: true }),
      { parse: apiData<MyAccessResponse> },
    );
  }

  /** GET /me/companies (server default filtering) as a resource; idle while `scope()` is undefined. */
  companiesResource(scope: () => string | undefined) {
    return httpResource<MyCompanyDto[]>(
      () => (scope() === undefined ? undefined : { url: AUTH_ENDPOINTS.myCompanies, withCredentials: true }),
      { parse: apiData<MyCompanyDto[]>, defaultValue: [] },
    );
  }

  /** GET /me/sessions as a resource; idle while `scope()` is undefined. */
  sessionsResource(scope: () => string | undefined) {
    return httpResource<SessionDto[]>(
      () => (scope() === undefined ? undefined : { url: AUTH_ENDPOINTS.mySessions, withCredentials: true }),
      { parse: apiData<SessionDto[]>, defaultValue: [] },
    );
  }

  access(): Observable<MyAccessResponse> {
    return this.http
      .get<ApiResponse<MyAccessResponse>>(AUTH_ENDPOINTS.myAccess, { withCredentials: true })
      .pipe(unwrapData());
  }

  sessions(): Observable<SessionDto[]> {
    return this.http
      .get<ApiResponse<SessionDto[]>>(AUTH_ENDPOINTS.mySessions, { withCredentials: true })
      .pipe(unwrapData());
  }

  /** Signs one device out, addressed by the opaque fingerprint from sessions(). */
  revokeSession(sessionRef: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(AUTH_ENDPOINTS.mySession(sessionRef), { withCredentials: true })
      .pipe(map(() => undefined));
  }
}
