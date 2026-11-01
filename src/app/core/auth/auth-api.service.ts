import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AUTH_ENDPOINTS } from './auth.endpoints';
import { ApiResponse } from '@shared/models/api-response.model';
import { unwrapData } from '../http/unwrap';
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
} from './auth.model';

@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);

  csrf(): Observable<CsrfTokenResponse> {
    return this.http.get<CsrfTokenResponse>(AUTH_ENDPOINTS.csrf, { withCredentials: true });
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(AUTH_ENDPOINTS.login, request, { withCredentials: true })
      .pipe(unwrapData());
  }

  selectMembership(request: SelectMembershipRequest): Observable<SelectMembershipResponse> {
    return this.http
      .post<ApiResponse<SelectMembershipResponse>>(AUTH_ENDPOINTS.selectMembership, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  /**
   * Activation write. Callers only need to know it succeeded: a 2xx with no `data`
   * is still success. Unwrapping an empty envelope would throw and leave the
   * set-password form on screen after the password was already saved.
   */
  setPassword(request: SetPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<SetPasswordResponse>>(AUTH_ENDPOINTS.setPassword, request, {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(AUTH_ENDPOINTS.forgotPassword, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  completeForgotPassword(request: CompleteForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(AUTH_ENDPOINTS.forgotPasswordComplete, request, {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }

  logout(): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(AUTH_ENDPOINTS.logout, {}, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  logoutAll(): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(AUTH_ENDPOINTS.logoutAll, {}, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  createLoginIntent(request: CreateLoginIntentRequest): Observable<CreateIntentResultDto> {
    return this.http
      .post<ApiResponse<CreateIntentResultDto>>(AUTH_ENDPOINTS.loginIntent, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  registerTenant(request: RegisterTenantRequest): Observable<RegisterTenantResult> {
    return this.http
      .post<ApiResponse<RegisterTenantResult>>(AUTH_ENDPOINTS.registerTenant, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }
}
