import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { SsoHandshakeService } from '../../../../core/auth/sso-handshake.service';
import {
  BroochError,
  isApplicationAccessDenied,
  isLoginIntentFailure,
  isNavigableRedirect,
} from '../../../../core/error/brooch-error.model';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login-page',
  imports: [TranslatePipe, RouterLink, FormField],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'auth.login.subtitle' | translate }}</p>

        @if (flow.intentId()) {
          <div class="ui-alert ui-alert--info" role="status">{{ 'auth.login.intentBanner' | translate }}</div>
        }
        @if (justOnboarded()) {
          <div class="ui-alert ui-alert--success" role="status">{{ 'auth.login.justOnboarded' | translate }}</div>
        }
        @if (selectionRestartRequired()) {
          <div class="ui-alert ui-alert--warning" role="status">{{ 'auth.login.selectionRestart' | translate }}</div>
        }
        @if (error()) {
          <div class="ui-alert ui-alert--error" role="alert">
            {{ error()!.message }}
            @if (cooldown() > 0) {
              <div class="ui-field__hint">{{ 'auth.login.retryIn' | translate: { seconds: cooldown() } }}</div>
            }
          </div>
        }

        <form (submit)="onSubmit($event)">
          <div class="ui-field">
            <label for="email">{{ 'auth.login.email' | translate }}</label>
            <input id="email" type="email" autocomplete="username" [formField]="loginForm.email" />
          </div>
          <div class="ui-field">
            <label for="password">{{ 'auth.login.password' | translate }}</label>
            <input
              id="password"
              type="password"
              autocomplete="current-password"
              [formField]="loginForm.password"
            />
          </div>
          <button class="ui-btn ui-btn--primary ui-btn--block" type="submit" [disabled]="busy() || loginForm().invalid() || cooldown() > 0">
            {{ 'auth.login.submit' | translate }}
          </button>
        </form>

        <div class="auth-shell__links">
          <a routerLink="/forgot-password">{{ 'auth.login.forgot' | translate }}</a>
          <a routerLink="/register">{{ 'auth.login.register' | translate }}</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly loginService = inject(LoginService);
  protected readonly flow = this.loginService.flowStore;
  private readonly sso = inject(SsoHandshakeService);
  private readonly router = inject(Router);

  protected readonly model = signal({ email: 'owner@brooch.sa', password: 'P@ssw0rd!2026' });
  protected readonly loginForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
    required(schema.password);
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly justOnboarded = signal(false);
  protected readonly selectionRestartRequired = signal(false);
  protected readonly redirecting = signal(false);
  protected readonly cooldown = signal(0);
  private readonly returnUrl = signal<string | null>(null);
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const query = this.loginService.readQueryState();
    this.returnUrl.set(query.returnUrl);
    this.justOnboarded.set(query.justOnboarded);
    this.selectionRestartRequired.set(query.selectionRestartRequired);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.loginForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        const value = this.model();
        const response = await firstValueFrom(this.loginService.signIn(value));

        if (response.requiresTenantSelection) {
          this.flow.setAvailableCompanies(response.availableCompanies);
          await this.router.navigate(['/select-company']);
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
        await (target ? this.router.navigateByUrl(target) : this.router.navigate(['/']));
      } catch (err) {
        const failure = err as BroochError;
        if (isApplicationAccessDenied(failure) && isNavigableRedirect(failure.redirectUrl)) {
          this.redirecting.set(true);
          this.loginService.clearFlow();
          this.sso.navigate(failure.redirectUrl);
          return;
        }
        if (isLoginIntentFailure(failure)) {
          this.loginService.clearIntent();
          this.loginService.scrubIntentFromUrl();
        }
        this.error.set(failure);
        if (failure.status === 429 || failure.code === 'Auth.RateLimited') {
          this.startCooldown(30);
        }
        if (failure.code === 'Auth.SessionExpired') {
          await this.router.navigate(['/session-expired'], {
            queryParams: this.returnUrl() ? { returnUrl: this.returnUrl() } : {},
          });
        }
      } finally {
        this.busy.set(false);
      }
    });
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(seconds);
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldown() - 1;
      this.cooldown.set(Math.max(0, next));
      if (next <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }
}
