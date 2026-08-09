/** Which wizard step a route renders. Payment only appears for a paid package. */
export type OnboardingStep = 'company' | 'package' | 'payment';

export interface CompanyProfileFormValue {
  arabicCompanyName: string;
  englishCompanyName: string;
}

export interface CardFormValue {
  name: string;
  number: string;
  month: string;
  year: string;
  cvc: string;
}

export type { TenantDto } from '../../../models/workspace.model';
export type {
  AvailablePackageView,
  PaymentConfiguration,
  SubscriptionOperationStatusView,
  SubscriptionPaymentResult,
} from '../../../models/subscription.model';
