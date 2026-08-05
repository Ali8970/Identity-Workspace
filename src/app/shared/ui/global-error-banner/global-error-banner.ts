import { Component, ElementRef, afterRenderEffect, inject, input, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GlobalErrorService } from '../../../core/error/global-error.service';
import { scrollAlertIntoView } from '../../utils/scroll-alert-into-view';

@Component({
  selector: 'app-global-error-banner',
  imports: [TranslatePipe],
  template: `
    @if (errors.error(); as failure) {
      @if (variant() === 'auth') {
        <div #alert class="auth-status auth-status--error" role="alert" aria-live="assertive">
          <span class="auth-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </span>
          <div class="auth-status__body">
            {{ failure.message }}
            @if (errors.fieldErrorList().length > 0) {
              <ul class="global-error-banner__fields">
                @for (item of errors.fieldErrorList(); track item.field + item.message) {
                  <li>{{ item.message }}</li>
                }
              </ul>
            }
            @if (errors.retryAfter() > 0) {
              <div class="auth-status__hint">
                {{ 'errors.retryIn' | translate: { seconds: errors.retryAfter() } }}
              </div>
            }
          </div>
        </div>
      } @else if (variant() === 'shell') {
        <div #alert class="shell__alert ui-alert ui-alert--error" role="alert" aria-live="assertive">
          <div class="global-error-banner__content">
            <p class="global-error-banner__message">{{ failure.message }}</p>
            @if (errors.retryAfter() > 0) {
              <p class="global-error-banner__meta">
                {{ 'errors.retryIn' | translate: { seconds: errors.retryAfter() } }}
              </p>
            }
          </div>
          <button
            type="button"
            class="global-error-banner__dismiss"
            (click)="dismiss()"
            [attr.aria-label]="'errors.dismiss' | translate"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      } @else {
        <div class="global-error-banner" role="alert" aria-live="assertive">
          <div class="global-error-banner__panel ui-alert ui-alert--error">
            <div class="global-error-banner__content">
              <p class="global-error-banner__message">{{ failure.message }}</p>

              @if (errors.fieldErrorList().length > 0) {
                <ul class="global-error-banner__fields">
                  @for (item of errors.fieldErrorList(); track item.field + item.message) {
                    <li>{{ item.message }}</li>
                  }
                </ul>
              }

              @if (failure.requiredPermissions?.length) {
                <p class="global-error-banner__meta">
                  {{ 'errors.requiredPermissions' | translate }}:
                  {{ failure.requiredPermissions.join(', ') }}
                </p>
              }

              @if (errors.retryAfter() > 0) {
                <p class="global-error-banner__meta">
                  {{ 'errors.retryIn' | translate: { seconds: errors.retryAfter() } }}
                </p>
              }

              @if (failure.traceId) {
                <p class="global-error-banner__trace">
                  {{ 'errors.traceId' | translate }}: {{ failure.traceId }}
                </p>
              }
            </div>

            <button
              type="button"
              class="global-error-banner__dismiss"
              (click)="dismiss()"
              [attr.aria-label]="'errors.dismiss' | translate"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>
      }
    }
  `,
})
export class GlobalErrorBanner {
  protected readonly errors = inject(GlobalErrorService);

  /** `auth` = inside login/register card; `shell` = workspace header area; `fixed` = viewport toast */
  readonly variant = input<'auth' | 'shell' | 'fixed'>('fixed');

  /** Only the in-flow variants can be scrolled past; `fixed` is a viewport toast. */
  private readonly alert = viewChild<ElementRef<HTMLElement>>('alert');

  constructor() {
    // Every backend failure lands here (the interceptor funnels them through
    // GlobalErrorService), so scrolling the banner into view once covers the whole app.
    // `afterRenderEffect` so the alert is in the DOM before it is measured; a new error is
    // always a new object, so a repeated failure re-scrolls.
    afterRenderEffect(() => {
      const failure = this.errors.error();
      const element = this.alert()?.nativeElement;
      if (failure && element) {
        scrollAlertIntoView(element);
      }
    });
  }

  protected dismiss(): void {
    this.errors.dismiss();
  }
}
