import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { SessionStage } from '../../enums/domain.enums';
import { AuthFlowStore } from '../auth/auth-flow.store';
import { SessionStore } from '../auth/session.store';
import {
  authGuard,
  guestGuard,
  onboardingCompleteGuard,
  onboardingGuard,
  tenantSelectionGuard,
} from './auth.guards';

/**
 * Minimal stand-ins for the two stores the guards read. Only the members the guards
 * actually touch are implemented — anything else would be untested scaffolding.
 */
class FakeSessionStore {
  readonly stageSignal = signal<SessionStage>(SessionStage.Unknown);
  readonly currentSignal = signal<unknown>(null);
  readonly companySignal = signal<{ tenantStatus: string } | null>(null);
  readonly onboardingCompletedSignal = signal(false);
  bootstrapCalls = 0;

  readonly stage = this.stageSignal.asReadonly();
  readonly current = this.currentSignal.asReadonly();
  readonly currentCompany = this.companySignal.asReadonly();
  readonly onboardingCompleted = this.onboardingCompletedSignal.asReadonly();

  isActive = () => this.stageSignal() === SessionStage.Active;
  isSelection = () => this.stageSignal() === SessionStage.Selection;
  isOnboarding = () =>
    !this.onboardingCompletedSignal() && this.companySignal()?.tenantStatus === 'Onboarding';

  /** Mimics the real store: /me resolves the stage and populates the payload. */
  bootstrapResult: SessionStage | null = null;
  bootstrap(): Observable<SessionStage> {
    this.bootstrapCalls++;
    if (this.bootstrapResult !== null) {
      this.stageSignal.set(this.bootstrapResult);
      this.currentSignal.set({});
    }
    return of(this.stageSignal());
  }
}

class FakeAuthFlowStore {
  readonly companies = signal<unknown[]>([]);
  readonly intentIdSignal = signal<string | null>(null);

  hasCompanies = () => this.companies().length > 0;
  intentId = () => this.intentIdSignal();
}

function routeWith(queryParams: Record<string, string> = {}): ActivatedRouteSnapshot {
  return {
    queryParamMap: {
      get: (key: string) => queryParams[key] ?? null,
    },
  } as unknown as ActivatedRouteSnapshot;
}

function stateWith(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

/** Serialises whatever a guard returned so assertions can compare against a url string. */
function resultUrl(result: unknown, router: Router): string | boolean {
  if (typeof result === 'boolean') {
    return result;
  }
  if (result instanceof RedirectCommand) {
    return router.serializeUrl(result.redirectTo);
  }
  return router.serializeUrl(result as never);
}

describe('auth guards', () => {
  let session: FakeSessionStore;
  let flow: FakeAuthFlowStore;
  let router: Router;

  beforeEach(() => {
    session = new FakeSessionStore();
    flow = new FakeAuthFlowStore();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SessionStore, useValue: session },
        { provide: AuthFlowStore, useValue: flow },
      ],
    });
    router = TestBed.inject(Router);
  });

  const runGuard = <T>(guard: () => T, route = routeWith(), url = '/members') =>
    TestBed.runInInjectionContext(() =>
      (guard as unknown as (r: ActivatedRouteSnapshot, s: RouterStateSnapshot) => T)(
        route,
        stateWith(url),
      ),
    );

  describe('authGuard', () => {
    it('admits an Active session that already has its /me payload', () => {
      session.stageSignal.set(SessionStage.Active);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(authGuard as never), router)).toBe(true);
    });

    it('sends an anonymous visitor to /login carrying the returnUrl', () => {
      session.stageSignal.set(SessionStage.Anonymous);
      const result = runGuard(authGuard as never, routeWith(), '/members');
      expect(resultUrl(result, router)).toBe('/login?returnUrl=%2Fmembers');
    });

    it('sends a Selection-stage session to the company picker', () => {
      session.stageSignal.set(SessionStage.Selection);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(authGuard as never), router)).toBe('/select-company');
    });

    it('bootstraps first when the stage is Unknown', async () => {
      session.bootstrapResult = SessionStage.Active;
      const result = await (runGuard(authGuard as never) as Observable<unknown>).toPromise();
      expect(session.bootstrapCalls).toBe(1);
      expect(resultUrl(result, router)).toBe(true);
    });

    it('bootstraps when Active but the /me payload is missing (post-login handoff)', () => {
      session.stageSignal.set(SessionStage.Active);
      session.currentSignal.set(null);
      runGuard(authGuard as never);
      expect(session.bootstrapCalls).toBe(1);
    });
  });

  describe('guestGuard', () => {
    it('lets an anonymous visitor reach the auth page', () => {
      session.stageSignal.set(SessionStage.Anonymous);
      expect(resultUrl(runGuard(guestGuard as never), router)).toBe(true);
    });

    it('redirects an Active session home', () => {
      session.stageSignal.set(SessionStage.Active);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(guestGuard as never), router)).toBe('/');
    });

    it('honours a safe returnUrl from the ACTIVATED ROUTE, not window.location', () => {
      session.stageSignal.set(SessionStage.Active);
      session.currentSignal.set({});
      const result = runGuard(guestGuard as never, routeWith({ returnUrl: '/teams' }));
      expect(resultUrl(result, router)).toBe('/teams');
    });

    it('ignores a protocol-relative returnUrl (open-redirect guard)', () => {
      session.stageSignal.set(SessionStage.Active);
      session.currentSignal.set({});
      const result = runGuard(guestGuard as never, routeWith({ returnUrl: '//evil.example' }));
      expect(resultUrl(result, router)).toBe('/');
    });

    it('sends a Selection-stage session to the picker', () => {
      session.stageSignal.set(SessionStage.Selection);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(guestGuard as never), router)).toBe('/select-company');
    });
  });

  describe('tenantSelectionGuard', () => {
    it('admits when the login response populated the picker', () => {
      flow.companies.set([{ tenantMembershipId: 'a' }]);
      session.stageSignal.set(SessionStage.Selection);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(tenantSelectionGuard as never), router)).toBe(true);
    });

    // Regression: this combination used to bounce to /login, which guestGuard bounced
    // straight back to /select-company — an infinite redirect loop on reload.
    it('admits a Selection-stage session whose in-memory company list was lost on reload', () => {
      flow.companies.set([]);
      session.stageSignal.set(SessionStage.Selection);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(tenantSelectionGuard as never), router)).toBe(true);
    });

    it('bootstraps on a cold reload and then admits the Selection stage', async () => {
      flow.companies.set([]);
      session.bootstrapResult = SessionStage.Selection;
      const result = await (
        runGuard(tenantSelectionGuard as never) as Observable<unknown>
      ).toPromise();
      expect(session.bootstrapCalls).toBe(1);
      expect(resultUrl(result, router)).toBe(true);
    });

    it('sends an already-Active session home instead of to /login', () => {
      flow.companies.set([]);
      session.stageSignal.set(SessionStage.Active);
      session.currentSignal.set({});
      expect(resultUrl(runGuard(tenantSelectionGuard as never), router)).toBe('/');
    });

    it('sends an anonymous visitor to /login flagged to restart selection', () => {
      flow.companies.set([]);
      session.stageSignal.set(SessionStage.Anonymous);
      expect(resultUrl(runGuard(tenantSelectionGuard as never), router)).toBe(
        '/login?selectionRestartRequired=1',
      );
    });

    it('preserves the intentId on the restart redirect', () => {
      flow.companies.set([]);
      flow.intentIdSignal.set('intent-7');
      session.stageSignal.set(SessionStage.Anonymous);
      expect(resultUrl(runGuard(tenantSelectionGuard as never), router)).toBe(
        '/login?selectionRestartRequired=1&intentId=intent-7',
      );
    });
  });

  describe('onboarding guards', () => {
    it('onboardingGuard diverts a tenant that is still onboarding', () => {
      session.companySignal.set({ tenantStatus: 'Onboarding' });
      expect(resultUrl(runGuard(onboardingGuard as never), router)).toBe('/onboarding/company');
    });

    it('onboardingGuard admits an active tenant', () => {
      session.companySignal.set({ tenantStatus: 'Active' });
      expect(resultUrl(runGuard(onboardingGuard as never), router)).toBe(true);
    });

    it('onboardingCompleteGuard bounces an already-active tenant out of onboarding', () => {
      session.companySignal.set({ tenantStatus: 'Active' });
      expect(resultUrl(runGuard(onboardingCompleteGuard as never), router)).toBe('/applications');
    });

    it('onboardingCompleteGuard admits a tenant that is still onboarding', () => {
      session.companySignal.set({ tenantStatus: 'Onboarding' });
      expect(resultUrl(runGuard(onboardingCompleteGuard as never), router)).toBe(true);
    });

    // Regression: Back out of CRM re-entered the wizard on the cached /me/companies row and
    // let the owner start a second free trial.
    it('onboardingCompleteGuard bounces once the trial started, before /me catches up', () => {
      session.companySignal.set({ tenantStatus: 'Onboarding' });
      session.onboardingCompletedSignal.set(true);
      expect(resultUrl(runGuard(onboardingCompleteGuard as never), router)).toBe('/applications');
    });

    it('onboardingGuard keeps a just-subscribed tenant in the workspace', () => {
      session.companySignal.set({ tenantStatus: 'Onboarding' });
      session.onboardingCompletedSignal.set(true);
      expect(resultUrl(runGuard(onboardingGuard as never), router)).toBe(true);
    });
  });
});
