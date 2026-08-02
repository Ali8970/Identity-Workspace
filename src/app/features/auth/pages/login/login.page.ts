import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthFlowStore } from '../../../../core/auth/auth-flow.store';
import { SessionStore } from '../../../../core/auth/session.store';
import { SsoHandshakeService } from '../../../../core/auth/sso-handshake.service';
import { isNavigableRedirect } from '../../../../core/error/error.model';
import { GlobalErrorService } from '../../../../core/error/global-error.service';
import { redirectAwayIfAuthenticated } from '../../../../core/guards/auth.guards';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login-page',
  imports: [TranslatePipe, RouterLink, FormField, AuthLayout],
  host: {
    '(window:pageshow)': 'onPageShow($event)',
  },
  template: `
    <app-auth-layout>
      <header class="auth-form__head">
        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'auth.login.title' | translate }}
        </h1>
        <p class="auth-form__lead">{{ 'auth.login.subtitle' | translate }}</p>
      </header>

      @if (flow.intentId()) {
        <div class="auth-status auth-status--info" role="status">
          <span class="auth-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10v6M12 7h.01" />
            </svg>
          </span>
          <span class="auth-status__body">{{ 'auth.login.intentBanner' | translate }}</span>
        </div>
      }
      @if (selectionRestartRequired()) {
        <div class="auth-status auth-status--warning" role="status">
          <span class="auth-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 8v5M12 16h.01" />
              <path
                d="M10.3 4.5 2.6 18a1 1 0 0 0 .9 1.5h16.9a1 1 0 0 0 .9-1.5L13.7 4.5a1 1 0 0 0-1.8 0Z"
              />
            </svg>
          </span>
          <span class="auth-status__body">{{ 'auth.login.selectionRestart' | translate }}</span>
        </div>
      }

      <form class="auth-form" (submit)="onSubmit($event)" novalidate>
        <div class="auth-field">
          <label class="auth-field__label" for="login-email">{{
            'auth.login.email' | translate
          }}</label>
          <div class="auth-field__control">
            <span class="auth-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M4 6h16v12H4z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <input
              id="login-email"
              class="auth-field__input"
              [class.auth-field__input--invalid]="emailInvalid()"
              type="email"
              autocomplete="username"
              inputmode="email"
              [placeholder]="'auth.login.emailPlaceholder' | translate"
              [formField]="loginForm.email"
            />
          </div>
          @if (emailInvalid()) {
            <p class="auth-field__error" id="login-email-error">
              {{ 'auth.login.emailInvalid' | translate }}
            </p>
          }
        </div>

        <div class="auth-field">
          <div class="auth-field__label-row">
            <label class="auth-field__label" for="login-password">
              {{ 'auth.login.password' | translate }}
            </label>
            <a class="auth-form__link auth-form__link--inline" routerLink="/forgot-password">
              {{ 'auth.login.forgot' | translate }}
            </a>
          </div>
          <div class="auth-field__control">
            <span class="auth-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              id="login-password"
              class="auth-field__input auth-field__input--password"
              [class.auth-field__input--invalid]="passwordInvalid()"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              [placeholder]="'auth.login.passwordPlaceholder' | translate"
              [formField]="loginForm.password"
              [attr.aria-describedby]="passwordInvalid() ? 'login-password-error' : null"
            />
            <button
              type="button"
              class="auth-field__toggle"
              (click)="togglePasswordVisibility()"
              [attr.aria-label]="
                (showPassword() ? 'auth.login.hidePassword' : 'auth.login.showPassword') | translate
              "
              [attr.aria-pressed]="showPassword()"
            >
              @if (showPassword()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6A2 2 0 0 0 12 15a2 2 0 0 0 1.4-.6" />
                  <path d="M6.7 6.7C4.6 8.1 3 10.2 3 12s3.5 6 9 6c1.4 0 2.7-.4 3.9-1" />
                  <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c5.5 0 9 4 9 7 0 1.1-.5 2.3-1.4 3.4" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              }
            </button>
          </div>
          @if (passwordInvalid()) {
            <p class="auth-field__error" id="login-password-error">
              {{ 'auth.login.passwordRequired' | translate }}
            </p>
          }
        </div>

        <div class="auth-form__actions">
          <button
            class="ui-btn ui-btn--primary auth-form__submit"
            type="submit"
            [disabled]="busy() || loginForm().invalid() || globalErrors.retryAfter() > 0"
          >
            <span class="auth-form__submit-inner">
              @if (busy()) {
                <span class="auth-form__spinner" aria-hidden="true"></span>
                {{ 'auth.login.submitting' | translate }}
              } @else {
                {{ 'auth.login.submit' | translate }}
              }
            </span>
          </button>
        </div>
      </form>

      <p class="auth-form__register">
        {{ 'auth.login.noAccount' | translate }}
        <a class="auth-form__link" routerLink="/register">{{
          'auth.login.register' | translate
        }}</a>
      </p>
    </app-auth-layout>

    @if (redirecting()) {
      <div class="auth-overlay" role="status" aria-live="polite" aria-busy="true">
        <div class="auth-overlay__panel">
          <span class="auth-overlay__spinner" aria-hidden="true"></span>
          <span>{{ 'auth.login.redirecting' | translate }}</span>
        </div>
      </div>
    }
  `,
})
export class LoginPage {
  private readonly loginService = inject(LoginService);
  protected readonly globalErrors = inject(GlobalErrorService);
  private readonly sso = inject(SsoHandshakeService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  /** Injected directly rather than reached through LoginService. */
  protected readonly flow = inject(AuthFlowStore);

  protected readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
    required(schema.password);
  });

  protected readonly busy = signal(false);
  protected readonly selectionRestartRequired = signal(false);
  protected readonly redirecting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);

  protected readonly emailInvalid = computed(
    () => this.submitted() && this.loginForm.email().invalid(),
  );
  protected readonly passwordInvalid = computed(
    () => this.submitted() && this.loginForm.password().invalid(),
  );

  private readonly returnUrl = signal<string | null>(null);

  constructor() {
    const query = this.loginService.readQueryState();
    this.returnUrl.set(query.returnUrl);
    this.selectionRestartRequired.set(query.selectionRestartRequired);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected onPageShow(event: PageTransitionEvent): void {
    // bfcache / history restore — guards do not re-run; leave if still signed in.
    // Always probe: login() may have left stage=Active with no /me payload.
    if (event.persisted || this.session.isAuthenticated()) {
      this.redirecting.set(true);
      void firstValueFrom(redirectAwayIfAuthenticated(this.session, this.router)).then(
        (left) => {
          if (!left) {
            this.redirecting.set(false);
            this.busy.set(false);
          }
        },
      );
      return;
    }
    this.redirecting.set(false);
    this.busy.set(false);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    void submit(this.loginForm, async () => {
      this.busy.set(true);
      this.globalErrors.clear();
      try {
        const value = this.model();
        const response = await firstValueFrom(this.loginService.signIn(value));

        if (response.requiresTenantSelection) {
          this.flow.setAvailableCompanies(response.availableCompanies);
          await this.router.navigate(['/select-company'], { replaceUrl: true });
          return;
        }

        if (isNavigableRedirect(response.redirectUrl)) {
          this.redirecting.set(true);
          this.loginService.clearFlow();
          this.sso.navigate(response.redirectUrl);
          return;
        }

        this.loginService.clearFlow();
        await firstValueFrom(this.loginService.refreshSession());
        const target = this.returnUrl();
        await (target
          ? this.router.navigateByUrl(target, { replaceUrl: true })
          : this.router.navigate(['/'], { replaceUrl: true }));
      } finally {
        this.busy.set(false);
      }
    });
  }
}
