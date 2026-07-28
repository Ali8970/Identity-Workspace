import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../core/auth/auth-api.service';
import { BroochError } from '../../core/error/brooch-error.model';

/**
 * Matches prototype + Identity-cycle:
 * Email link → `/reset-password?userId=…&token=<opaque>`
 * `token` is captured, scrubbed from the URL, and sent on POST — never shown as an input.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [TranslatePipe, RouterLink, FormField],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'auth.reset.title' | translate }}</p>

        @if (!hasLink()) {
          <div class="ui-alert ui-alert--error" role="alert">
            {{ 'auth.reset.invalidLink' | translate }}
          </div>
          <a class="ui-btn ui-btn--primary ui-btn--block" routerLink="/forgot-password">
            {{ 'auth.reset.requestNew' | translate }}
          </a>
        } @else if (done()) {
          <div class="ui-alert ui-alert--success" role="status">
            {{ 'auth.reset.success' | translate }}
          </div>
          <a class="ui-btn ui-btn--primary ui-btn--block" routerLink="/login">
            {{ 'common.backToLogin' | translate }}
          </a>
        } @else {
          @if (error()) {
            <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
          }
          <form (submit)="onSubmit($event)">
            <div class="ui-field">
              <label for="password">{{ 'auth.reset.password' | translate }}</label>
              <input
                id="password"
                type="password"
                autocomplete="new-password"
                [formField]="resetForm.newPassword"
              />
            </div>
            <div class="ui-field">
              <label for="confirm">{{ 'auth.reset.confirm' | translate }}</label>
              <input
                id="confirm"
                type="password"
                autocomplete="new-password"
                [formField]="resetForm.confirmPassword"
              />
            </div>
            <button
              class="ui-btn ui-btn--primary ui-btn--block"
              type="submit"
              [disabled]="busy() || resetForm().invalid()"
            >
              {{ 'auth.reset.submit' | translate }}
            </button>
          </form>
          <div class="auth-shell__links">
            <a routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordPage {
  private readonly authApi = inject(AuthApi);

  private readonly userId = signal('');
  private readonly token = signal('');
  protected readonly model = signal({ newPassword: '', confirmPassword: '' });
  protected readonly resetForm = form(this.model, (schema) => {
    required(schema.newPassword);
    required(schema.confirmPassword);
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly done = signal(false);
  protected readonly hasLink = computed(() => this.userId() !== '' && this.token() !== '');

  constructor() {
    const params = new URLSearchParams(window.location.search);
    const userId = (params.get('userId') ?? '').trim();
    const token = (params.get('token') ?? '').trim();
    this.userId.set(userId);
    this.token.set(token);
    if (userId && token) {
      this.scrubUrl();
    }
  }

  private scrubUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('userId');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.resetForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        const value = this.model();
        if (value.newPassword !== value.confirmPassword) {
          this.error.set({
            status: 400,
            code: 'Identity.Password.PolicyFailed',
            message: 'Passwords do not match',
            messageKey: 'Identity.Password.PolicyFailed',
            correlationId: null,
            redirectUrl: null,
            raw: null,
          });
          return;
        }
        await firstValueFrom(
          this.authApi.completeForgotPassword({
            userId: this.userId(),
            token: this.token(),
            newPassword: value.newPassword,
            confirmPassword: value.confirmPassword,
          }),
        );
        this.done.set(true);
      } catch (err) {
        this.error.set(err as BroochError);
      } finally {
        this.busy.set(false);
      }
    });
  }
}
