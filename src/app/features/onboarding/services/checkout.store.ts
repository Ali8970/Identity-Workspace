import { Service, computed, signal } from '@angular/core';
import { PaymentConfiguration } from '../../../models/subscription.model';

/**
 * The little that must outlive a single onboarding page.
 *
 * A paid checkout leaves the app entirely for the provider's 3DS challenge, and each wizard
 * step is its own routed component. Two breadcrumbs survive that round trip in
 * `sessionStorage`: which package was chosen and which purchase is in flight.
 *
 * This is not journey state. Progress is always re-read from the server (`GET /tenant`,
 * `GET /subscriptions/current`, `GET /subscription-operations/{id}`); the operation id is only
 * a handle, and the backend re-validates it against the session on every call. Nothing
 * security-relevant is stored: no amount, no payment outcome, and deliberately no payment id.
 *
 * `paymentConfiguration` stays in memory only. It is issued per purchase, so a stale copy must
 * never be replayed after a reload — a resumed checkout asks the server for a fresh one.
 */
const STORAGE_KEY = 'brooch.onboarding.checkout';

interface CheckoutBreadcrumb {
  packageId: string | null;
  operationId: string | null;
}

const EMPTY: CheckoutBreadcrumb = { packageId: null, operationId: null };

@Service()
export class CheckoutStore {
  private readonly breadcrumb = signal<CheckoutBreadcrumb>(readBreadcrumb());
  private readonly configuration = signal<PaymentConfiguration | null>(null);

  readonly packageId = computed(() => this.breadcrumb().packageId);
  readonly operationId = computed(() => this.breadcrumb().operationId);
  readonly paymentConfiguration = this.configuration.asReadonly();

  /** A new choice invalidates any operation opened for the previous one. */
  selectPackage(packageId: string): void {
    this.write({ packageId, operationId: null });
    this.configuration.set(null);
  }

  /**
   * Records a purchase the server has opened. Called before anything else that could navigate:
   * from here on a real operation exists, and the 3DS return leg needs its id even if this tab
   * is replaced.
   */
  openOperation(operationId: string, configuration: PaymentConfiguration | null): void {
    this.write({ packageId: this.packageId(), operationId });
    this.configuration.set(configuration);
  }

  clear(): void {
    this.write(EMPTY);
    this.configuration.set(null);
  }

  private write(next: CheckoutBreadcrumb): void {
    this.breadcrumb.set(next);
    persist(next);
  }
}

function readBreadcrumb(): CheckoutBreadcrumb {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return EMPTY;
    }
    const parsed = JSON.parse(raw) as Partial<CheckoutBreadcrumb>;
    return {
      packageId: typeof parsed.packageId === 'string' ? parsed.packageId : null,
      operationId: typeof parsed.operationId === 'string' ? parsed.operationId : null,
    };
  } catch {
    return EMPTY;
  }
}

function persist(breadcrumb: CheckoutBreadcrumb): void {
  try {
    if (breadcrumb.packageId === null && breadcrumb.operationId === null) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(breadcrumb));
  } catch {
    // A blocked storage quota must never break checkout. The in-memory signal still carries
    // same-tab navigation; only the provider round trip loses its fallback breadcrumb — and
    // the backend also puts the operation id on the callback URL.
  }
}
