import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TenantApi } from '../../../core/api/workspace-api.service';
import {
  CompanyProfileFormValue,
  PackageDto,
  TenantDto,
} from '../models/onboarding-feature.model';

@Service()
export class OnboardingService {
  private readonly tenantApi = inject(TenantApi);

  loadTenant(): Observable<TenantDto> {
    return this.tenantApi.get();
  }

  loadPackages(): Observable<PackageDto[]> {
    return this.tenantApi.packages();
  }

  saveCompanyProfile(value: CompanyProfileFormValue): Observable<unknown> {
    return this.tenantApi.updateProfile({
      companyNameAr: value.arabicCompanyName.trim(),
      companyNameEn: value.englishCompanyName.trim(),
    });
  }

  startFreeTrial(packageId: string): Observable<unknown> {
    return this.tenantApi.startFreeTrial(packageId);
  }
}
