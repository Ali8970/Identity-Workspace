import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../core/auth/auth-api.service';
import { BroochError } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-forgot-password-page',
  imports: [TranslatePipe, RouterLink, FormField],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'auth.forgot.title' | translate }}</p>
        @if (error()) {
          <div class="ui-error" role="alert">{{ error()!.message }}</div>
        }
        @if (done()) {
          <div class="ui-error" role="status">{{ 'auth.forgot.success' | translate }}</div>
        }
        <form (submit)="onSubmit($event)">
          <div class="ui-field">
            <label for="email">{{ 'auth.forgot.email' | translate }}</label>
            <input id="email" type="email" [formField]="forgotForm.email" />
          </div>
          <button class="ui-btn ui-btn--primary" type="submit" [disabled]="busy() || forgotForm().invalid()">
            {{ 'auth.forgot.submit' | translate }}
          </button>
        </form>
        <div class="auth-shell__links">
          <a routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordPage {
  private readonly authApi = inject(AuthApi);
  protected readonly model = signal({ email: '' });
  protected readonly forgotForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly done = signal(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.forgotForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        await firstValueFrom(this.authApi.forgotPassword({ email: this.model().email.trim() }));
        this.done.set(true);
      } catch (err) {
        this.error.set(err as BroochError);
      } finally {
        this.busy.set(false);
      }
    });
  }
}
