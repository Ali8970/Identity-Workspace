import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { API_ROUTES, CSRF_EXEMPT_PATHS } from '../../constants/api-routes';
import { AuthFlowStore } from '../auth/auth-flow.store';
import { CsrfService } from '../auth/csrf.service';
import { SessionStore } from '../auth/session.store';
import { SsoHandshakeService } from '../auth/sso-handshake.service';
import {
  BroochError,
  isApplicationAccessDenied,
  isLoginIntentFailure,
  isNavigableRedirect,
  isSafeReturnUrl,
} from './error.model';
import { GlobalErrorService } from './global-error.service';

export interface ApiErrorRequestContext {
  url: string;
  method: string;
  silent: boolean;
}

@Service()
export class ApiErrorHandler {
  private readonly globalError = inject(GlobalErrorService);
  private readonly csrf = inject(CsrfService);
  private readonly session = inject(SessionStore);
  private readonly flow = inject(AuthFlowStore);
  private readonly sso = inject(SsoHandshakeService);
  private readonly router = inject(Router);

  handle(error: BroochError, request: ApiErrorRequestContext): void {
    this.applySideEffects(error, request);

    if (request.silent || this.shouldSuppressDisplay(request)) {
      return;
    }

    if (this.handledByNavigation(error, request)) {
      return;
    }

    this.globalError.show(error);
  }

  private applySideEffects(error: BroochError, request: ApiErrorRequestContext): void {
    if (error.code === 'Auth.AntiforgeryFailed') {
      this.csrf.invalidate();
    }

    if (isApplicationAccessDenied(error) && isNavigableRedirect(error.redirectUrl)) {
      this.flow.clear();
      this.sso.navigate(error.redirectUrl);
      return;
    }

    if (isLoginIntentFailure(error)) {
      this.flow.clearIntent();
      this.scrubIntentFromUrl();
    }

    if (error.code === 'Auth.SessionExpired') {
      this.session.markAnonymous();
      const returnUrl = this.readReturnUrl();
      void this.router.navigate(['/session-expired'], {
        queryParams: returnUrl ? { returnUrl } : {},
      });
      return;
    }

    if (this.shouldLogoutOnUnauthorized(error, request)) {
      this.session.markAnonymous();
      if (!this.router.url.startsWith('/login')) {
        void this.router.navigate(['/login']);
      }
    }
  }

  /**
   * Bootstrap probes fail routinely for anonymous visitors; the session store
   * turns those into navigation, so they must not raise the error banner.
   * Matched on the exact path — `/me` as a substring would also catch
   * `/memberships`.
   */
  private shouldSuppressDisplay(request: ApiErrorRequestContext): boolean {
    const path = request.url.split('?')[0].replace(/\/$/, '');
    return (
      path === API_ROUTES.me || path === API_ROUTES.myCompanies || path === API_ROUTES.csrf
    );
  }

  private handledByNavigation(error: BroochError, request: ApiErrorRequestContext): boolean {
    if (isApplicationAccessDenied(error) && isNavigableRedirect(error.redirectUrl)) {
      return true;
    }
    if (error.code === 'Auth.SessionExpired') {
      return true;
    }
    // Only suppress the banner when we actually force a re-auth navigation.
    if (this.shouldLogoutOnUnauthorized(error, request)) {
      return true;
    }
    return false;
  }

  /**
   * Authenticated API 401s end the local session.
   * Public auth failures (login wrong password, etc.) must stay and show the banner.
   */
  private shouldLogoutOnUnauthorized(
    error: BroochError,
    request: ApiErrorRequestContext,
  ): boolean {
    if (error.status !== 401) {
      return false;
    }
    if (error.code === 'Auth.InvalidCredentials') {
      return false;
    }
    // Login / register / password flows are anonymous — never treat as session loss.
    if (this.isPublicAuthRequest(request.url)) {
      return false;
    }
    // No session to clear; show the error instead of a no-op logout that hides it.
    if (!this.session.isAuthenticated()) {
      return false;
    }
    return true;
  }

  private isPublicAuthRequest(url: string): boolean {
    const path = url.split('?')[0];
    return CSRF_EXEMPT_PATHS.some((suffix) => path.endsWith(suffix));
  }

  private readReturnUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const path = this.router.url;
    if (path.startsWith('/login') || path.startsWith('/session-expired')) {
      return null;
    }
    return isSafeReturnUrl(path) ? path : null;
  }

  private scrubIntentFromUrl(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    if (!url.searchParams.has('intentId')) {
      return;
    }
    url.searchParams.delete('intentId');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}
