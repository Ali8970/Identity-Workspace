export type OnboardingStep = 'company' | 'package';

export interface CompanyProfileFormValue {
  arabicCompanyName: string;
  englishCompanyName: string;
}

export type { PackageDto, TenantDto } from '../../../models/workspace.model';
