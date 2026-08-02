import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { SessionStage } from '../../enums/domain.enums';
import { AuthFlowStore } from '../auth/auth-flow.store';
import { SessionStore } from '../auth/session.store';
import { isSafeReturnUrl } from '../error/error.model';

/**
 * True when stage alone is not enough — e.g. login() sets Active before /me runs.
 * Without this, authGuard would admit an empty shell (no name, no apps, no permissions).
 */
function needsSessionPayload(session: SessionStore): boolean {
  const stage = session.stage();
  if (stage === SessionStage.Unknown) {
    return true;
  }
  if (
    (stage === SessionStage.Active || stage === SessionStage.Selection) &&
    !session.current()
  ) {
    return true;
  }
  return false;
}

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const flow = inject(AuthFlowStore);

  if (needsSessionPayload(session)) {
    return session.bootstrap().pipe(
      map((stage) => resolveAuth(stage, state.url, router, flow)),
    );
  }

  return resolveAuth(session.stage(), state.url, router, flow);
};

function resolveAuth(
  stage: SessionStage,
  url: string,
  router: Router,
  flow: AuthFlowStore,
): boolean | RedirectCommand {
  if (stage === SessionStage.Selection) {
    return new RedirectCommand(
      router.createUrlTree(['/select-company'], {
        queryParams: flow.intentId() ? { intentId: flow.intentId() } : {},
      }),
      { replaceUrl: true },
    );
  }
  if (stage === SessionStage.Active) {
    return true;
  }
  return new RedirectCommand(
    router.createUrlTree(['/login'], {
      queryParams: { returnUrl: url },
    }),
    { replaceUrl: true },
  );
}

/**
 * Blocks guest-only auth pages when a session is already active.
 * Redirects with replaceUrl so Back never re-surfaces a usable login form.
 * Reuses the bootstrapped /me payload (no location.replace) so the shell is fully hydrated.
 */
export const guestGuard: CanActivateFn = (route) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  // Read returnUrl from the route being activated, not window.location — during an
  // in-app navigation the address bar still holds the PREVIOUS url.
  const returnUrl = route.queryParamMap.get('returnUrl');

  if (needsSessionPayload(session)) {
    return session.bootstrap().pipe(map((stage) => resolveGuest(stage, router, returnUrl)));
  }

  return resolveGuest(session.stage(), router, returnUrl);
};

function resolveGuest(
  stage: SessionStage,
  router: Router,
  returnUrl: string | null,
): boolean | RedirectCommand {
  if (stage === SessionStage.Active) {
    return new RedirectCommand(guestHomeUrlTree(router, returnUrl), { replaceUrl: true });
  }
  if (stage === SessionStage.Selection) {
    return new RedirectCommand(router.createUrlTree(['/select-company']), {
      replaceUrl: true,
    });
  }
  return true;
}

function guestHomeUrlTree(router: Router, returnUrl: string | null) {
  if (isSafeReturnUrl(returnUrl)) {
    return router.parseUrl(returnUrl);
  }
  return router.createUrlTree(['/']);
}

/** Replace the guest URL in history so Back skips the auth form. */
export function leaveAuthenticatedGuestRoute(router?: Router): void {
  const target = (() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    return isSafeReturnUrl(returnUrl) ? returnUrl : '/';
  })();

  if (router) {
    void router.navigateByUrl(target, { replaceUrl: true });
    return;
  }
  window.location.replace(target);
}

/**
 * Probes the session and leaves the current guest/auth URL when still signed in.
 * Safe to call from pageshow / bfcache restores where route guards do not re-run.
 * Always refreshes when the Active stage has no /me payload (post-login handoff).
 */
export function redirectAwayIfAuthenticated(
  session: SessionStore,
  router: Router,
): Observable<boolean> {
  const goHome = (): true => {
    leaveAuthenticatedGuestRoute(router);
    return true;
  };

  if (session.isActive() && session.current()) {
    return of(goHome());
  }
  if (session.isSelection() && session.current()) {
    void router.navigateByUrl('/select-company', { replaceUrl: true });
    return of(true);
  }

  // Active/Selection without payload, or Unknown — load /me before entering the shell.
  if (
    session.stage() === SessionStage.Unknown ||
    session.isActive() ||
    session.isSelection()
  ) {
    return session.bootstrap().pipe(
      map((stage) => {
        if (stage === SessionStage.Active) {
          return goHome();
        }
        if (stage === SessionStage.Selection) {
          void router.navigateByUrl('/select-company', { replaceUrl: true });
          return true;
        }
        return false;
      }),
      catchError(() => of(false)),
    );
  }

  return of(false);
}

export const tenantSelectionGuard: CanActivateFn = () => {
  const flow = inject(AuthFlowStore);
  const session = inject(SessionStore);
  const router = inject(Router);

  if (needsSessionPayload(session)) {
    return session.bootstrap().pipe(map(() => resolveTenantSelection(session, flow, router)));
  }

  return resolveTenantSelection(session, flow, router);
};

function resolveTenantSelection(
  session: SessionStore,
  flow: AuthFlowStore,
  router: Router,
): boolean | RedirectCommand {
  // Normal path: the login response populated the picker.
  if (flow.hasCompanies()) {
    return true;
  }

  // Reload / deep link: AuthFlowStore is in-memory and therefore empty, but the cookie
  // session is still mid-selection. Admit the page — SelectCompanyPage rebuilds the list
  // from GET /me/companies. Redirecting to /login here would only bounce back, because
  // guestGuard sends a Selection-stage visitor straight to /select-company.
  if (session.isSelection()) {
    return true;
  }

  // Already bound to a company — there is nothing to select.
  if (session.isActive()) {
    return new RedirectCommand(router.createUrlTree(['/']), { replaceUrl: true });
  }

  return new RedirectCommand(
    router.createUrlTree(['/login'], {
      queryParams: {
        selectionRestartRequired: '1',
        ...(flow.intentId() ? { intentId: flow.intentId() } : {}),
      },
    }),
    { replaceUrl: true },
  );
}

export const onboardingGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const company = session.currentCompany();
  if (company?.tenantStatus === 'Onboarding') {
    return router.createUrlTree(['/onboarding/company']);
  }
  return true;
};

export const onboardingCompleteGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const company = session.currentCompany();
  if (company && company.tenantStatus !== 'Onboarding') {
    return router.createUrlTree(['/applications']);
  }
  return true;
};
