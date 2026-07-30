import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { PasswordService } from '../../services/password.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [TranslatePipe, RouterLink, FormField, AuthLayout],
  template: `
    <app-auth-layout>
      @if (done()) {
        <div class="auth-success fade-up" role="status">
          <div class="auth-success__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>

          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{ 'auth.forgot.successTitle' | translate }}
          </h1>

          <p class="auth-success__message">{{ 'auth.forgot.success' | translate }}</p>

          @if (submittedEmail()) {
            <p class="auth-success__email">{{ submittedEmail() }}</p>
          }

          <ol class="auth-success__steps">
            <li>{{ 'auth.forgot.stepMailbox' | translate }}</li>
            <li>{{ 'auth.forgot.stepResetLink' | translate }}</li>
            <li>{{ 'auth.forgot.stepSignIn' | translate }}</li>
          </ol>

          <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/login">
            {{ 'auth.forgot.goToLogin' | translate }}
          </a>
        </div>
      } @else {
        <header class="auth-form__head">
          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{ 'auth.forgot.title' | translate }}
          </h1>
          <p class="auth-form__lead">{{ 'auth.forgot.subtitle' | translate }}</p>
        </header>

        <div class="auth-form__info" role="note">
          {{ 'auth.forgot.privacyNote' | translate }}
        </div>

        <form class="auth-form" (submit)="onSubmit($event)" novalidate>
          <div class="auth-field">
            <label class="auth-field__label" for="forgot-email">
              {{ 'auth.forgot.email' | translate }}
            </label>
            <div class="auth-field__control">
              <span class="auth-field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </span>
              <input
                id="forgot-email"
                class="auth-field__input"
                [class.auth-field__input--invalid]="emailInvalid()"
                type="email"
                autocomplete="email"
                inputmode="email"
                [placeholder]="'auth.forgot.emailPlaceholder' | translate"
                [formField]="forgotForm.email"
                [attr.aria-describedby]="emailInvalid() ? 'forgot-email-error' : null"
              />
            </div>
            @if (emailInvalid()) {
              <p class="auth-field__error" id="forgot-email-error">
                {{ 'auth.forgot.emailInvalid' | translate }}
              </p>
            }
          </div>

          <div class="auth-form__actions">
            <button
              class="ui-btn ui-btn--primary auth-form__submit"
              type="submit"
              [disabled]="busy() || forgotForm().invalid()"
            >
              <span class="auth-form__submit-inner">
                @if (busy()) {
                  <span class="auth-form__spinner" aria-hidden="true"></span>
                  {{ 'auth.forgot.submitting' | translate }}
                } @else {
                  {{ 'auth.forgot.submit' | translate }}
                }
              </span>
            </button>
          </div>
        </form>

        <p class="auth-form__register">
          {{ 'auth.forgot.rememberPassword' | translate }}
          <a class="auth-form__link" routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
        </p>
      }
    </app-auth-layout>
  `,
})
export class ForgotPasswordPage {
  private readonly passwordService = inject(PasswordService);

  protected readonly model = signal({ email: '' });
  protected readonly forgotForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
  });

  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submittedEmail = signal('');

  protected readonly emailInvalid = computed(
    () => this.submitted() && this.forgotForm.email().invalid(),
  );

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    void submit(this.forgotForm, async () => {
      this.busy.set(true);
      try {
        const emailValue = this.model().email.trim();
        await firstValueFrom(this.passwordService.requestForgotPassword(emailValue));
        this.submittedEmail.set(emailValue);
        this.done.set(true);
      } finally {
        this.busy.set(false);
      }
    });
  }
}
