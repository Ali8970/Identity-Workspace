import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { RegisterService } from '../../services/register.service';

interface RegisterOutcome {
  requiresPasswordSetup: boolean;
  email: string;
  arabicCompanyName: string;
  englishCompanyName: string;
}

@Component({
  selector: 'app-register-page',
  imports: [TranslatePipe, RouterLink, FormField, AuthLayout],
  template: `
    <app-auth-layout>
      @if (outcome()) {
        <div class="auth-success fade-up" role="status">
          <div class="auth-success__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>

          <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
            {{
              (isNewRegistration()
                ? 'auth.register.successNewTitle'
                : 'auth.register.successExistingTitle') | translate
            }}
          </h1>

          <p class="auth-success__message">
            {{
              successMessageKey()
                | translate: { company: companyName(), email: registeredEmail() }
            }}
          </p>

          @if (!isNewRegistration()) {
            <p class="auth-success__email">{{ registeredEmail() }}</p>
          }

          <ol class="auth-success__steps">
            @if (isNewRegistration()) {
              <li>{{ 'auth.register.stepMailbox' | translate }}</li>
              <li>{{ 'auth.register.stepSetPassword' | translate }}</li>
              <li>{{ 'auth.register.stepSignIn' | translate }}</li>
            } @else {
              <li>{{ 'auth.register.stepExistingSignIn' | translate }}</li>
            }
          </ol>

          @if (!isNewRegistration()) {
            <p class="auth-success__message">
              {{ 'auth.register.existingWrongEmail' | translate }}
            </p>
          }

          @if (isNewRegistration()) {
            <a
              class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              routerLink="/login"
            >
              {{ 'auth.register.goToLogin' | translate }}
            </a>
          } @else {
            <a
              class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              routerLink="/login"
              [queryParams]="{ email: registeredEmail() }"
            >
              {{ 'auth.register.signIn' | translate }}
            </a>
            <button type="button" class="auth-form__link justify-self-center" (click)="registerAnother()">
              {{ 'auth.register.registerAnother' | translate }}
            </button>
          }
        </div>
      } @else {
        <header class="auth-form__head">
          <p class="mb-2 text-[12px] font-semibold tracking-wide text-text-muted uppercase">
            {{ 'auth.register.progress' | translate }}
          </p>
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
              class="btn-primary auth-form__submit inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-4 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
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
  private readonly language = inject(LanguageService);

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
  protected readonly outcome = signal<RegisterOutcome | null>(null);
  protected readonly submitted = signal(false);

  protected readonly isNewRegistration = computed(
    () => this.outcome()?.requiresPasswordSetup === true,
  );

  protected readonly registeredEmail = computed(() => this.outcome()?.email ?? '');

  protected readonly companyName = computed(() => {
    const outcome = this.outcome();
    if (!outcome) {
      return '';
    }
    return this.language.pick(outcome.arabicCompanyName, outcome.englishCompanyName);
  });

  protected readonly successMessageKey = computed(() => {
    if (this.isNewRegistration()) {
      return 'auth.register.successNew';
    }
    return this.companyName()
      ? 'auth.register.successExistingNamed'
      : 'auth.register.successExisting';
  });

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
        this.outcome.set({
          requiresPasswordSetup: result.requiresPasswordSetup,
          email: value.managerEmail.trim(),
          arabicCompanyName: value.arabicCompanyName.trim(),
          englishCompanyName: value.englishCompanyName.trim(),
        });
      } finally {
        this.busy.set(false);
      }
    });
  }

  /** The company is already created, so the next registration starts from an empty form. */
  protected registerAnother(): void {
    this.outcome.set(null);
    this.submitted.set(false);
    this.model.set({
      arabicCompanyName: '',
      englishCompanyName: '',
      managerEmail: '',
      firstName: '',
      lastName: '',
    });
  }
}
