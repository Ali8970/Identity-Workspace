import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SsoHandshakeService } from '../../../../core/auth/sso-handshake.service';
import { isNavigableRedirect } from '../../../../core/error/error.model';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { SelectCompanyService } from '../../services/select-company.service';

@Component({
  selector: 'app-select-company-page',
  imports: [TranslatePipe, RouterLink, AuthLayout],
  host: {
    class: 'auth-page-host auth-page-host--wide',
  },
  template: `
    <app-auth-layout>
      <header class="auth-form__head">
        <h1 class="auth-form__title" id="main-content-header" tabindex="-1">
          {{ 'auth.selectCompany.title' | translate }}
        </h1>
        <p class="auth-form__lead">{{ 'auth.selectCompany.subtitle' | translate }}</p>
      </header>

      @if (flow.intentId()) {
        <div class="auth-status auth-status--info" role="status">
          <span class="auth-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10v6M12 7h.01" />
            </svg>
          </span>
          <span class="auth-status__body">{{ 'auth.selectCompany.intentBanner' | translate }}</span>
        </div>
      }

      @if (companies().length === 0) {
        <div class="auth-success">
          <div class="auth-success__icon auth-success__icon--info" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M4 21V8l8-4 8 4v13" />
              <path d="M9 21V12h6v9" />
            </svg>
          </div>
          <p class="auth-success__message">{{ 'auth.selectCompany.emptyList' | translate }}</p>
          <a class="ui-btn ui-btn--primary auth-form__submit" routerLink="/login">
            {{ 'common.backToLogin' | translate }}
          </a>
        </div>
      } @else {
        <p class="auth-form__section-lead">{{ 'auth.selectCompany.chooseHint' | translate }}</p>

        <div class="auth-company-list" role="list">
          @for (company of companies(); track company.tenantMembershipId) {
            <button
              type="button"
              class="auth-company-card"
              role="listitem"
              [class.auth-company-card--busy]="selectingId() === company.tenantMembershipId"
              [disabled]="busy()"
              (click)="choose(company.tenantMembershipId)"
            >
              <span class="auth-company-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M4 21V8l8-4 8 4v13" />
                  <path d="M9 21V12h6v9" />
                </svg>
              </span>

              <span class="auth-company-card__body">
                <strong class="auth-company-card__name">
                  {{ label(company.companyNameAr, company.companyNameEn) }}
                </strong>
                <span class="auth-company-card__badges">
                  @if (company.isOwner) {
                    <span class="auth-company-card__badge auth-company-card__badge--owner">
                      {{ 'auth.selectCompany.ownerBadge' | translate }}
                    </span>
                  }
                  @if (company.hasActiveSubscription) {
                    <span class="auth-company-card__badge auth-company-card__badge--active">
                      {{ 'auth.selectCompany.subscriptionBadge' | translate }}
                    </span>
                  }
                  @if (company.status) {
                    <span class="auth-company-card__badge">{{ company.status }}</span>
                  }
                </span>
              </span>

              @if (selectingId() === company.tenantMembershipId) {
                <span class="auth-company-card__spinner" aria-hidden="true"></span>
              } @else {
                <span class="auth-company-card__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </span>
              }
            </button>
          }
        </div>
      }

      <p class="auth-form__register">
        <a class="auth-form__link" routerLink="/login">{{ 'common.backToLogin' | translate }}</a>
      </p>
    </app-auth-layout>

    @if (redirecting()) {
      <div class="auth-overlay" role="status" aria-live="polite" aria-busy="true">
        <div class="auth-overlay__panel">
          <span class="auth-overlay__spinner" aria-hidden="true"></span>
          <span>{{ 'auth.selectCompany.redirecting' | translate }}</span>
        </div>
      </div>
    }
  `,
})
export class SelectCompanyPage {
  private readonly selectCompanyService = inject(SelectCompanyService);
  protected readonly flow = this.selectCompanyService.flow;
  private readonly sso = inject(SsoHandshakeService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  protected readonly companies = this.flow.availableCompanies;
  protected readonly busy = signal(false);
  protected readonly selectingId = signal<string | null>(null);
  protected readonly redirecting = signal(false);

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected async choose(tenantMembershipId: string): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.selectingId.set(tenantMembershipId);
    try {
      const response = await firstValueFrom(
        this.selectCompanyService.selectCompany(tenantMembershipId),
      );
      if (isNavigableRedirect(response.redirectUrl)) {
        this.redirecting.set(true);
        this.selectCompanyService.clearFlow();
        this.sso.navigate(response.redirectUrl);
        return;
      }
      this.selectCompanyService.clearFlow();
      await firstValueFrom(this.selectCompanyService.refreshSession());
      await this.router.navigate(['/']);
    } finally {
      this.busy.set(false);
      this.selectingId.set(null);
    }
  }
}
