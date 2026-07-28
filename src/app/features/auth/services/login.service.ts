import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthFlowStore } from '../../../core/auth/auth-flow.store';
import { SessionStore } from '../../../core/auth/session.store';
import { isSafeReturnUrl } from '../../../core/error/error.model';
import { LoginResponse } from '../../../models/auth.model';
import { LoginCredentials, LoginQueryState } from '../models/auth-feature.model';

@Service()
export class LoginService {
  private readonly session = inject(SessionStore);
  private readonly flow = inject(AuthFlowStore);

  readonly flowStore = this.flow;

  readQueryState(): LoginQueryState {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intentId');
    if (intent) {
      this.flow.startIntent(intent);
    } else {
      this.flow.clearIntent();
    }
    this.flow.clearTenantSelection();
    const returnUrl = params.get('returnUrl');
    return {
      intentId: intent,
      returnUrl: isSafeReturnUrl(returnUrl) ? returnUrl : null,
      justOnboarded: params.get('onboarded') === '1',
      selectionRestartRequired: params.get('selectionRestartRequired') === '1',
    };
  }

  signIn(credentials: LoginCredentials): Observable<LoginResponse> {
    const intentId = this.flow.intentId();
    return this.session.login({
      email: credentials.email.trim(),
      password: credentials.password,
      ...(intentId ? { intentId } : {}),
    });
  }

  refreshSession(): Observable<unknown> {
    return this.session.refresh();
  }

  clearFlow(): void {
    this.flow.clear();
  }

  clearIntent(): void {
    this.flow.clearIntent();
  }

  scrubIntentFromUrl(): void {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('intentId')) {
      return;
    }
    url.searchParams.delete('intentId');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}
