import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
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

@Injectable({ providedIn: 'root' })
export class ApiErrorHandler {
  private readonly globalError = inject(GlobalErrorService);
  private readonly csrf = inject(CsrfService);
  private readonly session = inject(SessionStore);
  private readonly flow = inject(AuthFlowStore);
  private readonly sso = inject(SsoHandshakeService);
  private readonly router = inject(Router);

  handle(error: BroochError, request: ApiErrorRequestContext): void {
    this.applySideEffects(error);

    if (request.silent || this.shouldSuppressDisplay(error, request)) {
      return;
    }

    if (this.handledByNavigation(error)) {
      return;
    }

    this.globalError.show(error);
  }

  private applySideEffects(error: BroochError): void {
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
      const returnUrl = this.readReturnUrl();
      void this.router.navigate(['/session-expired'], {
        queryParams: returnUrl ? { returnUrl } : {},
      });
      return;
    }

    if (this.isUncodedSessionLoss(error)) {
      void this.router.navigate(['/login']);
      return;
    }

    if (
      error.code === 'Auth.NotAuthenticated' &&
      this.session.isSelection() &&
      !this.router.url.startsWith('/select-company')
    ) {
      void this.router.navigate(['/select-company']);
    }
  }

  private shouldSuppressDisplay(error: BroochError, request: ApiErrorRequestContext): boolean {
    if (request.url.includes('/auth/me') || request.url.includes('/auth/companies')) {
      return true;
    }
    if (request.url.includes('/auth/csrf')) {
      return true;
    }
    return false;
  }

  private handledByNavigation(error: BroochError): boolean {
    if (isApplicationAccessDenied(error) && isNavigableRedirect(error.redirectUrl)) {
      return true;
    }
    if (error.code === 'Auth.SessionExpired') {
      return true;
    }
    if (this.isUncodedSessionLoss(error)) {
      return true;
    }
    if (
      error.code === 'Auth.NotAuthenticated' &&
      this.session.isSelection() &&
      !this.router.url.startsWith('/select-company')
    ) {
      return true;
    }
    return false;
  }

  private isUncodedSessionLoss(error: BroochError): boolean {
    return error.status === 401 && !error.code;
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
