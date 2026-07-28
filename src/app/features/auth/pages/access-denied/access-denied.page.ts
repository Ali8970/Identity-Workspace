import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';

@Component({
  selector: 'app-access-denied-page',
  imports: [TranslatePipe, RouterLink, AuthLayout],
  template: `
    <app-auth-layout>
      <div class="auth-success fade-up">
        <div class="auth-success__icon auth-success__icon--danger" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>

        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'auth.accessDenied.title' | translate }}
        </h1>

        <p class="auth-success__message">{{ 'auth.accessDenied.body' | translate }}</p>

        <p class="auth-form__info auth-form__info--inline">
          {{ 'auth.accessDenied.hint' | translate }}
        </p>

        <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/login">
          {{ 'auth.accessDenied.signIn' | translate }}
        </a>

        <p class="auth-form__register">
          {{ 'auth.accessDenied.tryAnother' | translate }}
          <a class="auth-form__link" routerLink="/register">{{ 'auth.login.register' | translate }}</a>
        </p>
      </div>
    </app-auth-layout>
  `,
})
export class AccessDeniedPage {}
