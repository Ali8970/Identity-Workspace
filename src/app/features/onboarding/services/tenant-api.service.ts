import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ONBOARDING_ENDPOINTS } from '../constants/onboarding.endpoints';
import {
  readTenantId,
  TenantDto,
  TenantMeResponseWire,
  UpdateTenantProfileRequest,
} from '../models/tenant.model';
import { apiData } from '@core/http/unwrap';
import { ApiResponse } from '@shared/models/api-response.model';

function toTenantDto(tenant: TenantMeResponseWire): TenantDto {
  return {
    // GET /tenant is the only route that may serialise the id as { value }.
    tenantId: readTenantId(tenant.tenantId),
    companyNameAr: tenant.companyNameAr,
    companyNameEn: tenant.companyNameEn,
    status: tenant.status,
    onboardingState: tenant.onboardingState,
    onboardingCompleted: tenant.onboardingCompleted,
  };
}

@Service()
export class TenantApi {
  private readonly http = inject(HttpClient);

  /** GET /tenant as a resource, loaded once when created (reload() re-reads it). */
  tenantResource() {
    return httpResource<TenantDto>(
      () => ({ url: ONBOARDING_ENDPOINTS.tenant, withCredentials: true }),
      { parse: (body) => toTenantDto(apiData<TenantMeResponseWire>(body)) },
    );
  }

  /** Responds with message only — no data payload. */
  updateProfile(request: UpdateTenantProfileRequest): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(ONBOARDING_ENDPOINTS.tenantProfile, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }

}
