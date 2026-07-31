import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api.service';
import { RegisterFormValue } from '../models/auth-feature.model';
import { RegisterTenantRequest, RegisterTenantResult } from '../../../models/auth.model';

@Service()
export class RegisterService {
  private readonly authApi = inject(AuthApi);

  register(value: RegisterFormValue): Observable<RegisterTenantResult> {
    const request: RegisterTenantRequest = {
      arabicCompanyName: value.arabicCompanyName || null,
      englishCompanyName: value.englishCompanyName || null,
      managerEmail: value.managerEmail,
      firstName: value.firstName || null,
      lastName: value.lastName || null,
    };
    return this.authApi.registerTenant(request);
  }
}
