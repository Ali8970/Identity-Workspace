import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_ROUTES } from '../../constants/api-routes';
import { AuthFlowStore } from '../auth/auth-flow.store';
import { CsrfService } from '../auth/csrf.service';
import { SessionStore } from '../auth/session.store';
import { SsoHandshakeService } from '../auth/sso-handshake.service';
import { GlobalErrorService } from '../error/global-error.service';
import { LanguageService } from '../i18n/language.service';
import { csrfInterceptor } from './csrf.interceptor';
import { errorInterceptor } from './error.interceptor';

/**
 * Exercises the REAL interceptor chain in the order app.config.ts registers it,
 * because the ordering is exactly what this behaviour depends on.
 */
describe('csrfInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let primeCalls: number;
  let token: string | null;

  beforeEach(() => {
    primeCalls = 0;
    token = null;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([csrfInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CsrfService,
          useValue: {
            getToken: () => token,
            invalidate: () => (token = null),
            prime: () => {
              primeCalls++;
              token = `token-${primeCalls}`;
              return of(token);
            },
          },
        },
        { provide: LanguageService, useValue: { current: () => 'en' } },
        { provide: GlobalErrorService, useValue: { show: () => undefined, clear: () => undefined } },
        {
          provide: SessionStore,
          useValue: { markAnonymous: () => undefined, isAuthenticated: () => false },
        },
        { provide: AuthFlowStore, useValue: { clear: () => undefined, clearIntent: () => undefined } },
        { provide: SsoHandshakeService, useValue: { navigate: () => undefined } },
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('primes a token then attaches it to an unsafe request', () => {
    http.post(API_ROUTES.memberships, {}).subscribe({ error: () => undefined });

    const req = backend.expectOne(API_ROUTES.memberships);
    expect(primeCalls).toBe(1);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('token-1');
    req.flush({ statusCode: 200, message: 'ok', data: {} });
  });

  it('does not prime for a safe method', () => {
    http.get(API_ROUTES.memberships).subscribe({ error: () => undefined });
    backend.expectOne(API_ROUTES.memberships).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(primeCalls).toBe(0);
  });

  it('does not attach a token to a CSRF-exempt auth route', () => {
    http.post(API_ROUTES.login, {}).subscribe({ error: () => undefined });
    const req = backend.expectOne(API_ROUTES.login);
    expect(primeCalls).toBe(0);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    req.flush({ statusCode: 200, message: 'ok', data: {} });
  });

  // Diagnostic: with csrfInterceptor ALONE the retry works, which isolates the cause
  // of the failure below to the presence/ordering of errorInterceptor.
  it('retries in isolation (no errorInterceptor in the chain)', () => {
    TestBed.resetTestingModule();
    let calls = 0;
    let isolatedToken: string | null = null;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CsrfService,
          useValue: {
            getToken: () => isolatedToken,
            invalidate: () => (isolatedToken = null),
            prime: () => {
              calls++;
              isolatedToken = `token-${calls}`;
              return of(isolatedToken);
            },
          },
        },
      ],
    });
    const isolatedHttp = TestBed.inject(HttpClient);
    const isolatedBackend = TestBed.inject(HttpTestingController);

    isolatedHttp.post(API_ROUTES.memberships, {}).subscribe({ error: () => undefined });
    isolatedBackend
      .expectOne(API_ROUTES.memberships)
      .flush({ code: 'Auth.AntiforgeryFailed' }, { status: 400, statusText: 'Bad Request' });

    const retry = isolatedBackend.expectOne(API_ROUTES.memberships);
    expect(calls).toBe(2);
    retry.flush({ statusCode: 200, message: 'ok', data: {} });
    isolatedBackend.verify();
  });

  it('retries once with a fresh token after Auth.AntiforgeryFailed', () => {
    http.post(API_ROUTES.memberships, {}).subscribe({ error: () => undefined });

    backend
      .expectOne(API_ROUTES.memberships)
      .flush({ code: 'Auth.AntiforgeryFailed' }, { status: 400, statusText: 'Bad Request' });

    // The retry must go out with a newly primed token.
    const retry = backend.expectOne(API_ROUTES.memberships);
    expect(primeCalls).toBe(2);
    expect(retry.request.headers.get('X-XSRF-TOKEN')).toBe('token-2');
    retry.flush({ statusCode: 200, message: 'ok', data: {} });
  });
});
