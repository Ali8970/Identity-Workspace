import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SessionStore } from '../../../core/auth/session.store';
import { AuthFlowStore } from '../../../core/auth/auth-flow.store';
import { SelectCompanyService } from './select-company.service';

/**
 * "Back to sign in" on the picker cannot be a plain link to `/login`.
 *
 * The cookie session is real — it is simply still in Selection stage — and `guestGuard` sends
 * any authenticated visitor straight back to `/select-company` (pinned in auth.guards.spec).
 * Leaving therefore has to END the session, which is one of the few calls a Selection session
 * is allowed to make. These cases stop that from being quietly refactored back into a link.
 */
describe('SelectCompanyService sign-out', () => {
  let service: SelectCompanyService;
  let logoutCalls: number;
  let markAnonymousCalls: number;

  beforeEach(() => {
    logoutCalls = 0;
    markAnonymousCalls = 0;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: SessionStore,
          useValue: {
            companies: () => [],
            logout: () => {
              logoutCalls++;
              return of(undefined);
            },
            markAnonymous: () => markAnonymousCalls++,
          },
        },
        {
          provide: AuthFlowStore,
          useValue: { availableCompanies: () => [], intentId: () => null, clear: () => undefined },
        },
      ],
    });

    service = TestBed.inject(SelectCompanyService);
  });

  it('ends the Selection session rather than merely navigating', async () => {
    await new Promise((resolve) => service.signOut().subscribe(resolve));

    expect(logoutCalls).toBe(1);
  });

  /** A failed logout must still let the user reach /login, so the local session is dropped. */
  it('drops the local session when the logout call could not be made', () => {
    service.markSignedOut();

    expect(markAnonymousCalls).toBe(1);
  });
});
