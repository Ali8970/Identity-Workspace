import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';

@Component({
  selector: 'app-mock-target-page',
  imports: [TranslatePipe, RouterLink, AuthLayout],
  template: `
    <app-auth-layout>
      <div class="auth-success fade-up">
        <p class="auth-dev-badge">{{ 'mockTarget.devOnly' | translate }}</p>

        <div
          class="app-launcher-card__icon"
          [class]="'app-launcher-card__icon--' + appModifier()"
          aria-hidden="true"
        >
          @switch (appKey()) {
            @case ('crm') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3.5" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            @case ('hr') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            }
            @default {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            }
          }
        </div>

        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'mockTarget.title' | translate: { app: (appLabelKey() | translate) } }}
        </h1>

        <p class="auth-success__message">{{ 'mockTarget.body' | translate }}</p>

        <div class="auth-status auth-status--info" role="status">
          <span class="auth-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10v6M12 7h.01" />
            </svg>
          </span>
          <span class="auth-status__body">
            {{ 'mockTarget.app' | translate }}:
            <strong>{{ appKey() }}</strong>
          </span>
        </div>

        <p class="auth-form__info auth-form__info--inline">{{ 'mockTarget.hint' | translate }}</p>

        <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/applications">
          {{ 'mockTarget.back' | translate }}
        </a>
      </div>
    </app-auth-layout>
  `,
})
export class MockTargetPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly appKey = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('app') ?? 'app')),
    { initialValue: 'app' },
  );

  protected readonly appLabelKey = computed(() => {
    const key = this.appKey();
    const known = ['crm', 'hr', 'identity'];
    return known.includes(key) ? `mockTarget.apps.${key}` : key;
  });

  protected appModifier(): string {
    const key = this.appKey();
    if (key === 'identity' || key === 'crm' || key === 'hr') {
      return key;
    }
    return 'default';
  }
}
