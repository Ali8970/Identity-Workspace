import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_ROUTES } from '../../constants/api-routes';
import { AuthFlowStore } from '../auth/auth-flow.store';
import { CsrfService } from '../auth/csrf.service';
import { SessionStore } from '../auth/session.store';
import { SsoHandshakeService } from '../auth/sso-handshake.service';
import { ApiErrorHandler, ApiErrorRequestContext } from './api-error-handler.service';
import { BroochError } from './error.model';
import { GlobalErrorService } from './global-error.service';

function error(partial: Partial<BroochError>): BroochError {
  return {
    status: 500,
    code: null,
    message: 'failed',
    messageKey: null,
    correlationId: null,
    traceId: null,
    redirectUrl: null,
    fieldErrors: null,
    requiredPermissions: null,
    retryAfterSeconds: null,
    raw: null,
    ...partial,
  };
}

function request(partial: Partial<ApiErrorRequestContext> = {}): ApiErrorRequestContext {
  return { url: 'https://api.example/api/v1/roles', method: 'GET', silent: false, ...partial };
}

describe('ApiErrorHandler', () => {
  let handler: ApiErrorHandler;
  let shown: BroochError[];
  let markedAnonymous: number;
  let csrfInvalidated: number;
  let ssoNavigations: string[];
  let authenticated: boolean;
  let router: Router;
  let navigations: unknown[][];

  beforeEach(() => {
    shown = [];
    markedAnonymous = 0;
    csrfInvalidated = 0;
    ssoNavigations = [];
    authenticated = true;
    navigations = [];

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: GlobalErrorService,
          useValue: { show: (e: BroochError) => shown.push(e), clear: () => undefined },
        },
        { provide: CsrfService, useValue: { invalidate: () => csrfInvalidated++ } },
        {
          provide: SessionStore,
          useValue: {
            markAnonymous: () => markedAnonymous++,
            isAuthenticated: () => authenticated,
          },
        },
        {
          provide: AuthFlowStore,
          useValue: { clear: () => undefined, clearIntent: () => undefined },
        },
        { provide: SsoHandshakeService, useValue: { navigate: (u: string) => ssoNavigations.push(u) } },
      ],
    });

    router = TestBed.inject(Router);
    // The handler navigates for re-auth. Record the intent rather than exercising the
    // real router, which has no routes configured in this suite.
    vi.spyOn(router, 'navigate').mockImplementation((commands: readonly unknown[]) => {
      navigations.push([...commands]);
      return Promise.resolve(true);
    });
    handler = TestBed.inject(ApiErrorHandler);
  });

  describe('banner display', () => {
    it('shows the banner for an ordinary failure', () => {
      handler.handle(error({ status: 500, code: 'System.UnexpectedError' }), request());
      expect(shown.length).toBe(1);
    });

    it('stays silent when the request opted out', () => {
      handler.handle(error({ status: 500 }), request({ silent: true }));
      expect(shown.length).toBe(0);
    });

    it.each([API_ROUTES.me, API_ROUTES.myCompanies, API_ROUTES.csrf])(
      'suppresses the banner for bootstrap probe %s',
      (url) => {
        handler.handle(error({ status: 401 }), request({ url }));
        expect(shown.length).toBe(0);
      },
    );

    it('still shows the banner for a path that merely starts like /me', () => {
      handler.handle(error({ status: 500 }), request({ url: `${API_ROUTES.me}mberships` }));
      expect(shown.length).toBe(1);
    });
  });

  describe('401 handling', () => {
    it('ends the local session and sends the user to /login', () => {
      handler.handle(error({ status: 401, code: 'Auth.NotAuthenticated' }), request());
      expect(markedAnonymous).toBe(1);
      expect(navigations).toEqual([['/login']]);
    });

    // Regression: applySideEffects marks anonymous, so a later isAuthenticated() check
    // reads false. The banner must still stay suppressed because we DID navigate.
    it('suppresses the banner when it forced a re-auth navigation', () => {
      handler.handle(error({ status: 401, code: 'Auth.NotAuthenticated' }), request());
      expect(shown.length).toBe(0);
    });

    it('keeps invalid credentials on screen instead of logging out', () => {
      handler.handle(
        error({ status: 401, code: 'Auth.InvalidCredentials' }),
        request({ url: 'https://api.example/api/v1/auth/login', method: 'POST' }),
      );
      expect(markedAnonymous).toBe(0);
      expect(shown.length).toBe(1);
    });

    it('treats a public auth 401 as a normal failure, not session loss', () => {
      handler.handle(
        error({ status: 401 }),
        request({ url: 'https://api.example/api/v1/auth/forgot-password', method: 'POST' }),
      );
      expect(markedAnonymous).toBe(0);
      expect(shown.length).toBe(1);
    });

    it('shows the error rather than a no-op logout when there is no session', () => {
      authenticated = false;
      handler.handle(error({ status: 401 }), request());
      expect(markedAnonymous).toBe(0);
      expect(shown.length).toBe(1);
    });
  });

  describe('coded side effects', () => {
    it('invalidates the CSRF token on an antiforgery failure', () => {
      handler.handle(error({ status: 400, code: 'Auth.AntiforgeryFailed' }), request());
      expect(csrfInvalidated).toBe(1);
    });

    it('routes to /session-expired and suppresses the banner', () => {
      handler.handle(error({ status: 401, code: 'Auth.SessionExpired' }), request());
      expect(markedAnonymous).toBe(1);
      expect(shown.length).toBe(0);
      expect(navigations).toEqual([['/session-expired']]);
    });

    it('hands off to SSO on application access denied with a navigable redirect', () => {
      handler.handle(
        error({
          status: 403,
          code: 'Auth.ApplicationAccessDenied',
          redirectUrl: 'https://crm.example/denied',
        }),
        request(),
      );
      expect(ssoNavigations).toEqual(['https://crm.example/denied']);
      expect(shown.length).toBe(0);
    });

    it('falls back to the banner when the redirect is not navigable', () => {
      handler.handle(
        error({ status: 403, code: 'Auth.ApplicationAccessDenied', redirectUrl: 'javascript:alert(1)' }),
        request(),
      );
      expect(ssoNavigations).toEqual([]);
      expect(shown.length).toBe(1);
    });
  });

  it('shows a 403 permission denial with its requiredPermissions intact', () => {
    handler.handle(
      error({
        status: 403,
        code: 'Auth.PermissionDenied',
        requiredPermissions: ['identity.roles.read'],
      }),
      request(),
    );
    expect(shown[0].requiredPermissions).toEqual(['identity.roles.read']);
  });
});
