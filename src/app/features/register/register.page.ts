import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../core/auth/auth-api.service';
import { BroochError } from '../../core/error/brooch-error.model';

@Component({
  selector: 'app-register-page',
  imports: [TranslatePipe, RouterLink, FormField],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'auth.register.subtitle' | translate }}</p>
        @if (error()) {
          <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
        }
        @if (successKey()) {
          <div class="ui-alert ui-alert--success" role="status">
            {{ successKey()! | translate }}
          </div>
        }
        @if (!successKey()) {
          <form (submit)="onSubmit($event)">
            <div class="ui-field">
              <label for="ar">{{ 'auth.register.arabicName' | translate }}</label>
              <input id="ar" [formField]="registerForm.arabicCompanyName" />
            </div>
            <div class="ui-field">
              <label for="en">{{ 'auth.register.englishName' | translate }}</label>
              <input id="en" [formField]="registerForm.englishCompanyName" />
            </div>
            <div class="ui-field">
              <label for="email">{{ 'auth.register.email' | translate }}</label>
              <input id="email" type="email" [formField]="registerForm.managerEmail" />
            </div>
            <div class="ui-field">
              <label for="fn">{{ 'auth.register.firstName' | translate }}</label>
              <input id="fn" [formField]="registerForm.firstName" />
            </div>
            <div class="ui-field">
              <label for="ln">{{ 'auth.register.lastName' | translate }}</label>
              <input id="ln" [formField]="registerForm.lastName" />
            </div>
            <button
              class="ui-btn ui-btn--primary ui-btn--block"
              type="submit"
              [disabled]="busy() || registerForm().invalid()"
            >
              {{ 'auth.register.submit' | translate }}
            </button>
          </form>
        }
        <div class="auth-shell__links">
          <a routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private readonly authApi = inject(AuthApi);

  protected readonly model = signal({
    arabicCompanyName: '',
    englishCompanyName: '',
    managerEmail: '',
    firstName: '',
    lastName: '',
  });
  protected readonly registerForm = form(this.model, (schema) => {
    required(schema.managerEmail);
    email(schema.managerEmail);
    required(schema.firstName);
    required(schema.lastName);
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly successKey = signal<string | null>(null);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.registerForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        const value = this.model();
        const result = await firstValueFrom(this.authApi.registerTenant(value));
        this.successKey.set(
          result.requiresPasswordSetup
            ? 'auth.register.successNew'
            : 'auth.register.successExisting',
        );
      } catch (err) {
        this.error.set(err as BroochError);
      } finally {
        this.busy.set(false);
      }
    });
  }
}
