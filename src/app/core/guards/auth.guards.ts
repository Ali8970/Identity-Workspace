import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionStage } from '../../enums/domain.enums';
import { AuthFlowStore } from '../auth/auth-flow.store';
import { SessionStore } from '../auth/session.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.stage() === SessionStage.Unknown) {
    return session.bootstrap().pipe(
      map((stage) => resolveAuth(stage, state.url, router, inject(AuthFlowStore))),
    );
  }

  return resolveAuth(session.stage(), state.url, router, inject(AuthFlowStore));
};

function resolveAuth(
  stage: SessionStage,
  url: string,
  router: Router,
  flow: AuthFlowStore,
): boolean | ReturnType<Router['createUrlTree']> {
  if (stage === SessionStage.Selection) {
    return router.createUrlTree(['/select-company'], {
      queryParams: flow.intentId() ? { intentId: flow.intentId() } : {},
    });
  }
  if (stage === SessionStage.Active) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: url },
  });
}

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.stage() === SessionStage.Unknown || session.stage() === SessionStage.Anonymous) {
    return true;
  }
  if (session.isActive()) {
    return router.createUrlTree(['/']);
  }
  if (session.isSelection()) {
    return router.createUrlTree(['/select-company']);
  }
  return true;
};

export const tenantSelectionGuard: CanActivateFn = () => {
  const flow = inject(AuthFlowStore);
  const session = inject(SessionStore);
  const router = inject(Router);

  if (flow.hasCompanies() || session.isSelection()) {
    if (!flow.hasCompanies()) {
      return router.createUrlTree(['/login'], {
        queryParams: {
          selectionRestartRequired: '1',
          ...(flow.intentId() ? { intentId: flow.intentId() } : {}),
        },
      });
    }
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      selectionRestartRequired: '1',
      ...(flow.intentId() ? { intentId: flow.intentId() } : {}),
    },
  });
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
