import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { ApiResponse } from '../../models/api-response.model';
import {
  CurrentUserResponse,
  MyAccessResponse,
  MyCompanyDto,
  ProfileDto,
  SessionDto,
  UpdateProfileRequest,
} from '../../models/auth.model';

function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) {
    throw new Error(response.message || 'Empty API response');
  }
  return response.data;
}

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
      .get<ApiResponse<CurrentUserResponse>>(API_ROUTES.me, { withCredentials: true })
      .pipe(map(unwrap));
  }

  profile(): Observable<ProfileDto> {
    return this.http
      .get<ApiResponse<ProfileDto>>(API_ROUTES.myProfile, { withCredentials: true })
      .pipe(map(unwrap));
  }

  /** Returns the freshly re-read profile — the handler re-runs GetProfileQuery. */
  updateProfile(request: UpdateProfileRequest): Observable<ProfileDto> {
    return this.http
      .put<ApiResponse<ProfileDto>>(API_ROUTES.myProfile, request, { withCredentials: true })
      .pipe(map(unwrap));
  }

  /** includeUnavailable defaults to true server-side; pass false to drop non-selectable rows. */
  companies(includeUnavailable?: boolean): Observable<MyCompanyDto[]> {
    const params =
      includeUnavailable === undefined
        ? undefined
        : new HttpParams().set('includeUnavailable', includeUnavailable);
    return this.http
      .get<ApiResponse<MyCompanyDto[]>>(API_ROUTES.myCompanies, {
        withCredentials: true,
        params,
      })
      .pipe(map(unwrap));
  }

  /** Active-stage only: roles across every application in the current company. */
  access(): Observable<MyAccessResponse> {
    return this.http
      .get<ApiResponse<MyAccessResponse>>(API_ROUTES.myAccess, { withCredentials: true })
      .pipe(map(unwrap));
  }

  sessions(): Observable<SessionDto[]> {
    return this.http
      .get<ApiResponse<SessionDto[]>>(API_ROUTES.mySessions, { withCredentials: true })
      .pipe(map(unwrap));
  }

  /** Signs one device out, addressed by the opaque fingerprint from sessions(). */
  revokeSession(sessionRef: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(API_ROUTES.mySession(sessionRef), { withCredentials: true })
      .pipe(map(() => undefined));
  }
}
