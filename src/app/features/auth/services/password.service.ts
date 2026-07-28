import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api.service';
import { AuthFlowStore } from '../../../core/auth/auth-flow.store';
import {
  CompleteForgotPasswordRequest,
  ForgotPasswordRequest,
  SetPasswordRequest,
} from '../../../models/auth.model';
import { ResetPasswordFormValue, SetPasswordFormValue } from '../models/auth-feature.model';

@Service()
export class PasswordService {
  private readonly authApi = inject(AuthApi);
  private readonly flow = inject(AuthFlowStore);

  setPassword(userId: string, code: string, value: SetPasswordFormValue): Observable<unknown> {
    const request: SetPasswordRequest = {
      userId,
      code,
      password: value.password,
      confirmPassword: value.confirmPassword,
    };
    return this.authApi.setPassword(request);
  }

  completeReset(
    userId: string,
    token: string,
    value: ResetPasswordFormValue,
  ): Observable<unknown> {
    const request: CompleteForgotPasswordRequest = {
      userId,
      token,
      newPassword: value.newPassword,
      confirmPassword: value.confirmPassword,
    };
    return this.authApi.completeForgotPassword(request);
  }

  requestForgotPassword(email: string): Observable<unknown> {
    const request: ForgotPasswordRequest = { email: email.trim() };
    return this.authApi.forgotPassword(request);
  }

  clearAuthFlow(): void {
    this.flow.clear();
  }
}
