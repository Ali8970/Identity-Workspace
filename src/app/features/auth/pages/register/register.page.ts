import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { RegisterService } from '../../services/register.service';

@Component({
  selector: 'app-register-page',
  imports: [TranslatePipe, RouterLink, FormField, AuthLayout],
  template: `
    <app-auth-layout>
      @if (successKey(); as key) {
        <div class="auth-success fade-up" role="status">
          <div
            class="auth-success__icon"
            [class.auth-success__icon--info]="!isNewRegistration()"
            aria-hidden="true"
          >
            @if (isNewRegistration()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="m9 12 2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 10v6M12 7h.01" />
              </svg>
            }
          </div>

          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{
              (isNewRegistration()
                ? 'auth.register.successNewTitle'
                : 'auth.register.successExistingTitle') | translate
            }}
          </h1>

          <p class="auth-success__message">{{ key | translate }}</p>

          @if (isNewRegistration()) {
            <ol class="auth-success__steps">
              <li>{{ 'auth.register.stepMailbox' | translate }}</li>
              <li>{{ 'auth.register.stepSetPassword' | translate }}</li>
              <li>{{ 'auth.register.stepSignIn' | translate }}</li>
            </ol>
          }

          <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/login">
            {{ 'auth.register.goToLogin' | translate }}
          </a>
        </div>
      } @else {
        <header class="auth-form__head">
          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{ 'auth.register.title' | translate }}
          </h1>
          <p class="auth-form__lead">{{ 'auth.register.subtitle' | translate }}</p>
        </header>

        <form class="auth-form auth-form--register" (submit)="onSubmit($event)" novalidate>
          <section class="auth-form__section" aria-labelledby="register-company-heading">
            <h2 class="auth-form__section-title" id="register-company-heading">
              {{ 'auth.register.sectionCompany' | translate }}
            </h2>
            <p class="auth-form__section-lead">{{ 'auth.register.companyHint' | translate }}</p>

            <div class="auth-field">
              <label class="auth-field__label" for="register-ar">
                {{ 'auth.register.arabicName' | translate }}
              </label>
              <div class="auth-field__control">
                <span class="auth-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M4 21V8l8-4 8 4v13" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </span>
                <input
                  id="register-ar"
                  class="auth-field__input"
                  type="text"
                  dir="auto"
                  autocomplete="organization"
                  [placeholder]="'auth.register.arabicNamePlaceholder' | translate"
                  [formField]="registerForm.arabicCompanyName"
                />
              </div>
            </div>

            <div class="auth-field">
              <label class="auth-field__label" for="register-en">
                {{ 'auth.register.englishName' | translate }}
              </label>
              <div class="auth-field__control">
                <span class="auth-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M4 21V8l8-4 8 4v13" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </span>
                <input
                  id="register-en"
                  class="auth-field__input"
                  type="text"
                  autocomplete="organization"
                  [placeholder]="'auth.register.englishNamePlaceholder' | translate"
                  [formField]="registerForm.englishCompanyName"
                />
              </div>
            </div>
          </section>

          <section class="auth-form__section" aria-labelledby="register-owner-heading">
            <h2 class="auth-form__section-title" id="register-owner-heading">
              {{ 'auth.register.sectionOwner' | translate }}
            </h2>

            <div class="auth-field">
              <label class="auth-field__label" for="register-email">
                {{ 'auth.register.email' | translate }}
              </label>
              <div class="auth-field__control">
                <span class="auth-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </span>
                <input
                  id="register-email"
                  class="auth-field__input"
                  [class.auth-field__input--invalid]="emailInvalid()"
                  type="email"
                  autocomplete="email"
                  inputmode="email"
                  [placeholder]="'auth.register.emailPlaceholder' | translate"
                  [formField]="registerForm.managerEmail"
                  [attr.aria-describedby]="emailInvalid() ? 'register-email-error' : null"
                />
              </div>
              @if (emailInvalid()) {
                <p class="auth-field__error" id="register-email-error">
                  {{ 'auth.register.emailInvalid' | translate }}
                </p>
              }
            </div>

            <div class="auth-form__row">
              <div class="auth-field">
                <label class="auth-field__label" for="register-fn">
                  {{ 'auth.register.firstName' | translate }}
                </label>
                <div class="auth-field__control auth-field__control--plain">
                  <input
                    id="register-fn"
                    class="auth-field__input auth-field__input--plain"
                    type="text"
                    autocomplete="given-name"
                    [placeholder]="'auth.register.firstNamePlaceholder' | translate"
                    [formField]="registerForm.firstName"
                  />
                </div>
              </div>

              <div class="auth-field">
                <label class="auth-field__label" for="register-ln">
                  {{ 'auth.register.lastName' | translate }}
                </label>
                <div class="auth-field__control auth-field__control--plain">
                  <input
                    id="register-ln"
                    class="auth-field__input auth-field__input--plain"
                    type="text"
                    autocomplete="family-name"
                    [placeholder]="'auth.register.lastNamePlaceholder' | translate"
                    [formField]="registerForm.lastName"
                  />
                </div>
              </div>
            </div>
          </section>

          <div class="auth-form__actions">
            <button
              class="ui-btn ui-btn--primary auth-form__submit"
              type="submit"
              [disabled]="busy() || registerForm().invalid()"
            >
              <span class="auth-form__submit-inner">
                @if (busy()) {
                  <span class="auth-form__spinner" aria-hidden="true"></span>
                  {{ 'auth.register.submitting' | translate }}
                } @else {
                  {{ 'auth.register.submit' | translate }}
                }
              </span>
            </button>
          </div>
        </form>

        <p class="auth-form__register">
          {{ 'auth.register.hasAccount' | translate }}
          <a class="auth-form__link" routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
        </p>
      }
    </app-auth-layout>
  `,
  host: {
    class: 'auth-page-host auth-page-host--wide',
  },
})
export class RegisterPage {
  private readonly registerService = inject(RegisterService);

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
  });

  protected readonly busy = signal(false);
  protected readonly successKey = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly isNewRegistration = computed(
    () => this.successKey() === 'auth.register.successNew',
  );

  protected readonly emailInvalid = computed(
    () => this.submitted() && this.registerForm.managerEmail().invalid(),
  );

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    void submit(this.registerForm, async () => {
      this.busy.set(true);
      try {
        const value = this.model();
        const result = await firstValueFrom(this.registerService.register(value));
        this.successKey.set(
          result.requiresPasswordSetup
            ? 'auth.register.successNew'
            : 'auth.register.successExisting',
        );
      } finally {
        this.busy.set(false);
      }
    });
  }
}
