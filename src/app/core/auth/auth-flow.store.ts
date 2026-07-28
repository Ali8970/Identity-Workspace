import { Service, computed, signal } from '@angular/core';
import { STORAGE_KEYS } from '../../constants/app.constants';
import { AvailableTenantDto } from '../../models/auth.model';

@Service()
export class AuthFlowStore {
  private readonly intentIdSignal = signal<string | null>(this.readStoredIntent());
  private readonly companiesSignal = signal<AvailableTenantDto[]>([]);

  readonly intentId = this.intentIdSignal.asReadonly();
  readonly availableCompanies = this.companiesSignal.asReadonly();
  readonly hasCompanies = computed(() => this.companiesSignal().length > 0);

  startIntent(intentId: string): void {
    this.intentIdSignal.set(intentId);
    sessionStorage.setItem(STORAGE_KEYS.intentId, intentId);
  }

  clearIntent(): void {
    this.intentIdSignal.set(null);
    sessionStorage.removeItem(STORAGE_KEYS.intentId);
  }

  setAvailableCompanies(companies: AvailableTenantDto[]): void {
    this.companiesSignal.set([...companies]);
  }

  clearTenantSelection(): void {
    this.companiesSignal.set([]);
  }

  clear(): void {
    this.clearIntent();
    this.clearTenantSelection();
  }

  private readStoredIntent(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.intentId);
    } catch {
      return null;
    }
  }
}
