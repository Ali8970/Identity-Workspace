import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { isSafeReturnUrl } from '../../../../core/error/error.model';
import { redirectAwayIfAuthenticated } from '../../../../core/guards/auth.guards';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';

@Component({
  selector: 'app-session-expired-page',
  imports: [TranslatePipe, RouterLink, AuthLayout],
  host: {
    '(window:pageshow)': 'onPageShow($event)',
  },
  template: `
    <app-auth-layout>
      <div class="auth-success fade-up">
        <div class="auth-success__icon auth-success__icon--warning" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </div>

        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'auth.sessionExpired.title' | translate }}
        </h1>

        <p class="auth-success__message">{{ 'auth.sessionExpired.body' | translate }}</p>

        @if (hasReturnUrl()) {
          <p class="auth-form__info auth-form__info--inline">
            {{ 'auth.sessionExpired.returnHint' | translate }}
          </p>
        }

        <a
          class="ui-btn ui-btn--primary auth-form__submit"
          [routerLink]="['/login']"
          [queryParams]="loginParams()"
          [replaceUrl]="true"
        >
          {{ 'auth.sessionExpired.signIn' | translate }}
        </a>
      </div>
    </app-auth-layout>
  `,
})
export class SessionExpiredPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly loginParams = signal<Record<string, string>>(this.readLoginParams());

  protected hasReturnUrl(): boolean {
    return Object.hasOwn(this.loginParams(), 'returnUrl');
  }

  protected onPageShow(event: PageTransitionEvent): void {
    if (event.persisted || this.session.isAuthenticated()) {
      void firstValueFrom(redirectAwayIfAuthenticated(this.session, this.router));
    }
  }

  private readLoginParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    return isSafeReturnUrl(returnUrl) ? { returnUrl } : {};
  }
}
