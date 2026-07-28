import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom, map } from 'rxjs';
import { AuthApi } from '../../core/auth/auth-api.service';
import { AuthFlowStore } from '../../core/auth/auth-flow.store';
import { BroochError } from '../../core/error/brooch-error.model';

/**
 * Matches prototype + Identity-cycle:
 * Email link → `/set-password?userId=…&code=1234`
 * `code` is captured in memory, scrubbed from the URL, and sent on POST — never shown as an input.
 */
@Component({
  selector: 'app-set-password-page',
  imports: [TranslatePipe, RouterLink, FormField],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'auth.setPassword.title' | translate }}</p>

        @if (!hasLink()) {
          <div class="ui-alert ui-alert--error" role="alert">
            {{ 'auth.setPassword.invalidLink' | translate }}
          </div>
          <a class="ui-btn ui-btn--primary ui-btn--block" routerLink="/login">
            {{ 'common.backToLogin' | translate }}
          </a>
        } @else if (done()) {
          <div class="ui-alert ui-alert--success" role="status">
            {{ 'auth.setPassword.success' | translate }}
          </div>
          <a class="ui-btn ui-btn--primary ui-btn--block" routerLink="/login">
            {{ 'common.backToLogin' | translate }}
          </a>
        } @else {
          @if (error()) {
            <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
          }
          <form (submit)="onSubmit($event)">
            <div class="ui-field">
              <label for="password">{{ 'auth.setPassword.password' | translate }}</label>
              <input
                id="password"
                type="password"
                autocomplete="new-password"
                [formField]="passwordForm.password"
              />
            </div>
            <div class="ui-field">
              <label for="confirm">{{ 'auth.setPassword.confirm' | translate }}</label>
              <input
                id="confirm"
                type="password"
                autocomplete="new-password"
                [formField]="passwordForm.confirmPassword"
              />
            </div>
            <button
              class="ui-btn ui-btn--primary ui-btn--block"
              type="submit"
              [disabled]="busy() || passwordForm().invalid()"
            >
              {{ 'auth.setPassword.submit' | translate }}
            </button>
          </form>
          <div class="auth-shell__links">
            <a routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class SetPasswordPage {
  private readonly authApi = inject(AuthApi);
  private readonly flow = inject(AuthFlowStore);
  private readonly route = inject(ActivatedRoute);

  private readonly userId = signal('');
  private readonly code = signal('');
  protected readonly model = signal({ password: '', confirmPassword: '' });
  protected readonly passwordForm = form(this.model, (schema) => {
    required(schema.password);
    required(schema.confirmPassword);
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly done = signal(false);
  protected readonly hasLink = computed(() => this.userId() !== '' && this.code() !== '');

  private readonly query = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => ({
        userId: (params.get('userId') ?? '').trim(),
        code: (params.get('code') ?? '').trim(),
      })),
    ),
    { initialValue: { userId: '', code: '' } },
  );

  constructor() {
    // Capture from initial URL (and any later mailbox navigations)
    const bootstrap = () => {
      const fromRoute = this.query();
      const params = new URLSearchParams(window.location.search);
      const userId = fromRoute.userId || (params.get('userId') ?? '').trim();
      const code = fromRoute.code || (params.get('code') ?? '').trim();
      if (userId && code) {
        this.userId.set(userId);
        this.code.set(code);
        this.done.set(false);
        this.error.set(null);
        this.scrubUrl();
      }
    };
    bootstrap();
    // Re-run when query params change (mailbox open while already on this route)
    this.route.queryParamMap.subscribe(() => bootstrap());
  }

  private scrubUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('userId');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.passwordForm, async () => {
      this.busy.set(true);
      this.error.set(null);
      try {
        const value = this.model();
        if (value.password !== value.confirmPassword) {
          this.error.set({
            status: 400,
            code: 'Identity.Password.PolicyFailed',
            message: 'Passwords do not match',
            messageKey: 'Identity.Password.PolicyFailed',
            correlationId: null,
            redirectUrl: null,
            raw: null,
          });
          return;
        }
        await firstValueFrom(
          this.authApi.setPassword({
            userId: this.userId(),
            code: this.code(),
            password: value.password,
            confirmPassword: value.confirmPassword,
          }),
        );
        this.done.set(true);
        this.flow.clear();
      } catch (err) {
        this.error.set(err as BroochError);
      } finally {
        this.busy.set(false);
      }
    });
  }
}
