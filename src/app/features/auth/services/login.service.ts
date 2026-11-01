import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthFlowStore } from '@core/auth/auth-flow.store';
import { SessionStore } from '@core/auth/session.store';
import { isSafeReturnUrl } from '@core/error/error.model';
import { LoginResponse } from '@core/auth/auth.model';
import { LoginCredentials, LoginQueryState } from '../models/auth-feature.model';

@Service()
export class LoginService {
  private readonly session = inject(SessionStore);
  private readonly flow = inject(AuthFlowStore);

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
      selectionRestartRequired: params.get('selectionRestartRequired') === '1',
      justOnboarded: params.get('onboarded') === '1',
      justActivated: params.get('activated') === '1',
      email: loginEmailFromQuery(params.get('email')),
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

/** Accept only a single ordinary email so a crafted query cannot fill the field with junk. */
function loginEmailFromQuery(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const email = value.trim();
  if (email.length > 254 || /\s/.test(email)) {
    return null;
  }
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) {
    return null;
  }
  const domain = email.slice(at + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return null;
  }
  return email;
}
