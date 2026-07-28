import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom, map } from 'rxjs';
import { BroochError } from '../../../../core/error/brooch-error.model';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { PasswordService } from '../../services/password.service';

/**
 * Email link → `/reset-password?userId=…&token=<opaque>`
 * Token is captured, scrubbed from the URL, and sent on POST — never shown as an input.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [TranslatePipe, RouterLink, FormField, AuthLayout],
  template: `
    <app-auth-layout>
      @if (!hasLink()) {
        <div class="auth-success fade-up">
          <div class="auth-success__icon auth-success__icon--info" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>

          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{ 'auth.reset.invalidLinkTitle' | translate }}
          </h1>
          <p class="auth-success__message">{{ 'auth.reset.invalidLink' | translate }}</p>

          <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/forgot-password">
            {{ 'auth.reset.requestNew' | translate }}
          </a>
          <p class="auth-form__register">
            <a class="auth-form__link" routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
          </p>
        </div>
      } @else if (done()) {
        <div class="auth-success fade-up" role="status">
          <div class="auth-success__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>

          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{ 'auth.reset.successTitle' | translate }}
          </h1>
          <p class="auth-success__message">{{ 'auth.reset.success' | translate }}</p>

          <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/login">
            {{ 'auth.reset.goToLogin' | translate }}
          </a>
        </div>
      } @else {
        <header class="auth-form__head">
          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{ 'auth.reset.title' | translate }}
          </h1>
          <p class="auth-form__lead">{{ 'auth.reset.subtitle' | translate }}</p>
        </header>

        <div class="auth-form__info" role="note">
          {{ 'auth.reset.passwordHint' | translate }}
        </div>

        @if (error(); as failure) {
          <div class="auth-status auth-status--error" role="alert">
            <span class="auth-status__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </span>
            <span class="auth-status__body">{{ failure.message }}</span>
          </div>
        }

        <form class="auth-form" (submit)="onSubmit($event)" novalidate>
          <div class="auth-field">
            <label class="auth-field__label" for="reset-password">
              {{ 'auth.reset.password' | translate }}
            </label>
            <div class="auth-field__control">
              <span class="auth-field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                id="reset-password"
                class="auth-field__input auth-field__input--password"
                [class.auth-field__input--invalid]="passwordInvalid()"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                [placeholder]="'auth.reset.passwordPlaceholder' | translate"
                [formField]="resetForm.newPassword"
                [attr.aria-describedby]="passwordInvalid() ? 'reset-password-error' : null"
              />
              <button
                type="button"
                class="auth-field__toggle"
                (click)="togglePasswordVisibility('password')"
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
              <p class="auth-field__error" id="reset-password-error">
                {{ 'auth.reset.passwordRequired' | translate }}
              </p>
            }
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="reset-confirm">
              {{ 'auth.reset.confirm' | translate }}
            </label>
            <div class="auth-field__control">
              <span class="auth-field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                id="reset-confirm"
                class="auth-field__input auth-field__input--password"
                [class.auth-field__input--invalid]="confirmInvalid() || passwordMismatch()"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                [placeholder]="'auth.reset.confirmPlaceholder' | translate"
                [formField]="resetForm.confirmPassword"
                [attr.aria-describedby]="
                  confirmInvalid() || passwordMismatch() ? 'reset-confirm-error' : null
                "
              />
              <button
                type="button"
                class="auth-field__toggle"
                (click)="togglePasswordVisibility('confirm')"
                [attr.aria-label]="
                  (showConfirmPassword() ? 'auth.login.hidePassword' : 'auth.login.showPassword')
                    | translate
                "
                [attr.aria-pressed]="showConfirmPassword()"
              >
                @if (showConfirmPassword()) {
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
            @if (passwordMismatch()) {
              <p class="auth-field__error" id="reset-confirm-error">
                {{ 'auth.reset.passwordMismatch' | translate }}
              </p>
            } @else if (confirmInvalid()) {
              <p class="auth-field__error" id="reset-confirm-error">
                {{ 'auth.reset.confirmRequired' | translate }}
              </p>
            }
          </div>

          <div class="auth-form__actions">
            <button
              class="ui-btn ui-btn--primary auth-form__submit"
              type="submit"
              [disabled]="busy() || resetForm().invalid()"
            >
              <span class="auth-form__submit-inner">
                @if (busy()) {
                  <span class="auth-form__spinner" aria-hidden="true"></span>
                  {{ 'auth.reset.submitting' | translate }}
                } @else {
                  {{ 'auth.reset.submit' | translate }}
                }
              </span>
            </button>
          </div>
        </form>

        <p class="auth-form__register">
          <a class="auth-form__link" routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
        </p>
      }
    </app-auth-layout>
  `,
})
export class ResetPasswordPage {
  private readonly passwordService = inject(PasswordService);
  private readonly route = inject(ActivatedRoute);

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
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly hasLink = computed(() => this.userId() !== '' && this.token() !== '');

  protected readonly passwordInvalid = computed(
    () => this.submitted() && this.resetForm.newPassword().invalid(),
  );
  protected readonly confirmInvalid = computed(
    () => this.submitted() && this.resetForm.confirmPassword().invalid(),
  );
  protected readonly passwordMismatch = computed(() => {
    if (!this.submitted()) {
      return false;
    }
    const value = this.model();
    return value.newPassword !== '' && value.confirmPassword !== '' && value.newPassword !== value.confirmPassword;
  });

  private readonly query = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => ({
        userId: (params.get('userId') ?? '').trim(),
        token: (params.get('token') ?? '').trim(),
      })),
    ),
    { initialValue: { userId: '', token: '' } },
  );

  constructor() {
    const bootstrap = () => {
      const fromRoute = this.query();
      const params = new URLSearchParams(window.location.search);
      const userId = fromRoute.userId || (params.get('userId') ?? '').trim();
      const token = fromRoute.token || (params.get('token') ?? '').trim();
      if (userId && token) {
        this.userId.set(userId);
        this.token.set(token);
        this.done.set(false);
        this.error.set(null);
        this.submitted.set(false);
        this.scrubUrl();
      }
    };
    bootstrap();
    this.route.queryParamMap.subscribe(() => bootstrap());
  }

  protected togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword.update((visible) => !visible);
      return;
    }
    this.showConfirmPassword.update((visible) => !visible);
  }

  private scrubUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('userId');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    void submit(this.resetForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        const value = this.model();
        if (value.newPassword !== value.confirmPassword) {
          return;
        }
        await firstValueFrom(
          this.passwordService.completeReset(this.userId(), this.token(), value),
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
