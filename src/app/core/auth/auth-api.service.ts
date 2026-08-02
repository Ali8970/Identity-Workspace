import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { ApiResponse } from '../../models/api-response.model';
import { unwrapData } from '../api/unwrap';
import {
  CompleteForgotPasswordRequest,
  CreateIntentResultDto,
  CreateLoginIntentRequest,
  CsrfTokenResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterTenantRequest,
  RegisterTenantResult,
  SelectMembershipRequest,
  SelectMembershipResponse,
  SetPasswordRequest,
  SetPasswordResponse,
} from '../../models/auth.model';

@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);

  csrf(): Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>(API_ROUTES.csrf, { withCredentials: true });
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(API_ROUTES.login, request, { withCredentials: true })
      .pipe(unwrapData());
  }

  selectMembership(request: SelectMembershipRequest): Observable<SelectMembershipResponse> {
    return this.http
      .post<ApiResponse<SelectMembershipResponse>>(API_ROUTES.selectMembership, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  setPassword(request: SetPasswordRequest): Observable<SetPasswordResponse> {
    return this.http
      .post<ApiResponse<SetPasswordResponse>>(API_ROUTES.setPassword, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(API_ROUTES.forgotPassword, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  completeForgotPassword(request: CompleteForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(API_ROUTES.forgotPasswordComplete, request, {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }

  logout(): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(API_ROUTES.logout, {}, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  logoutAll(): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(API_ROUTES.logoutAll, {}, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  createLoginIntent(request: CreateLoginIntentRequest): Observable<CreateIntentResultDto> {
    return this.http
      .post<ApiResponse<CreateIntentResultDto>>(API_ROUTES.loginIntent, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  registerTenant(request: RegisterTenantRequest): Observable<RegisterTenantResult> {
    return this.http
      .post<ApiResponse<RegisterTenantResult>>(API_ROUTES.registerTenant, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }
}
