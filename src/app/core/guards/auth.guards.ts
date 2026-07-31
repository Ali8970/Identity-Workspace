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
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (needsSessionPayload(session)) {
    return session.bootstrap().pipe(map((stage) => resolveGuest(stage, router)));
  }

  return resolveGuest(session.stage(), router);
};

function resolveGuest(
  stage: SessionStage,
  router: Router,
): boolean | RedirectCommand {
  if (stage === SessionStage.Active) {
    return new RedirectCommand(guestHomeUrlTree(router), { replaceUrl: true });
  }
  if (stage === SessionStage.Selection) {
    return new RedirectCommand(router.createUrlTree(['/select-company']), {
      replaceUrl: true,
    });
  }
  return true;
}

function guestHomeUrlTree(router: Router) {
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get('returnUrl');
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

  if (flow.hasCompanies() || session.isSelection()) {
    if (!flow.hasCompanies()) {
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
    return true;
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
};

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
