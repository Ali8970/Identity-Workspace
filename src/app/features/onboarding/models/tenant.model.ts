/**
 * GET /tenant — TenantMeResponse as it comes off the wire.
 *
 * `tenantId` is the one place in the whole API that leaks a strongly-typed id
 * wrapper (`{ value }`) instead of a bare uuid, so it is modelled permissively
 * and normalised by TenantApi.get(). See `readTenantId`.
 */
export interface TenantMeResponseWire {
  tenantId: string | { value: string };
  code: string;
  email: string;
  status: string;
  onboardingState: string;
  onboardingCompleted: boolean;
  companyNameAr: string | null;
  companyNameEn: string | null;
  phone: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  activatedAt: string | null;
  onboardingCompletedAt: string | null;
}

/** Accepts both the wrapped and the bare form so either serialisation works. */
export function readTenantId(value: string | { value: string }): string {
  return typeof value === 'string' ? value : value.value;
}

/** Mapped view of GET /tenant for onboarding forms. */
export interface TenantDto {
  tenantId: string;
  companyNameAr: string | null;
  companyNameEn: string | null;
  status: string;
  onboardingState?: string;
  onboardingCompleted?: boolean;
}

/** PUT /tenant/profile — phone is accepted alongside the company names. */
export interface UpdateTenantProfileRequest {
  companyNameAr?: string | null;
  companyNameEn?: string | null;
  phone?: string | null;
}
