import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { ApiResponse } from '../../models/api-response.model';
import {
  CurrentUserResponse,
  MyCompanyDto,
  UpdateProfileRequest,
  UserProfileDto,
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

  me(): Observable<CurrentUserResponse> {
    return this.http
      .get<ApiResponse<CurrentUserResponse>>(API_ROUTES.me, { withCredentials: true })
      .pipe(map(unwrap));
  }

  permissions(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(API_ROUTES.mePermissions, { withCredentials: true })
      .pipe(map(unwrap));
  }

  profile(): Observable<UserProfileDto> {
    return this.http
      .get<ApiResponse<UserProfileDto>>(API_ROUTES.myProfile, { withCredentials: true })
      .pipe(map(unwrap));
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserProfileDto> {
    return this.http
      .put<ApiResponse<UserProfileDto>>(API_ROUTES.myProfile, request, { withCredentials: true })
      .pipe(map(unwrap));
  }

  companies(): Observable<MyCompanyDto[]> {
    return this.http
      .get<ApiResponse<MyCompanyDto[]>>(API_ROUTES.myCompanies, { withCredentials: true })
      .pipe(map(unwrap));
  }

  access(): Observable<unknown> {
    return this.http
      .get<ApiResponse<unknown>>(API_ROUTES.myAccess, { withCredentials: true })
      .pipe(map(unwrap));
  }

  sessions(): Observable<unknown[]> {
    return this.http
      .get<ApiResponse<unknown[]>>(API_ROUTES.mySessions, { withCredentials: true })
      .pipe(map(unwrap));
  }
}
