import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';

@Component({
  selector: 'app-denied-page',
  imports: [TranslatePipe, RouterLink, AuthLayout],
  template: `
    <app-auth-layout>
      <div class="auth-success fade-up">
        <div class="auth-success__icon auth-success__icon--warning" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            <path d="M12 15v2" />
          </svg>
        </div>

        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'auth.denied.title' | translate }}
        </h1>

        <p class="auth-success__message">{{ 'auth.denied.body' | translate }}</p>

        <p class="auth-form__info auth-form__info--inline">
          {{ 'auth.denied.hint' | translate }}
        </p>

        <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/applications">
          {{ 'auth.denied.goToApplications' | translate }}
        </a>

        <p class="auth-form__register">
          <a class="auth-form__link" routerLink="/my-access">{{ 'auth.denied.viewMyAccess' | translate }}</a>
          <span aria-hidden="true"> · </span>
          <a class="auth-form__link" routerLink="/account">{{ 'shell.account' | translate }}</a>
        </p>
      </div>
    </app-auth-layout>
  `,
})
export class DeniedPage {}
