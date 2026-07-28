import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SsoHandshakeService } from '../../../../core/auth/sso-handshake.service';
import {
  BroochError,
  isApplicationAccessDenied,
  isNavigableRedirect,
} from '../../../../core/error/brooch-error.model';
import { LanguageService } from '../../../../core/i18n/language.service';
import { SelectCompanyService } from '../../services/select-company.service';

@Component({
  selector: 'app-select-company-page',
  imports: [TranslatePipe],
  template: `
    <div class="auth-shell">
      <div class="auth-shell__panel ui-card">
        <h1 class="auth-shell__brand"><span>Brooch</span> Identity</h1>
        <p class="auth-shell__lead">{{ 'auth.selectCompany.subtitle' | translate }}</p>
        @if (flow.intentId()) {
          <div class="ui-alert ui-alert--info" role="status">
            {{ 'auth.selectCompany.intentBanner' | translate }}
          </div>
        }
        @if (error()) {
          <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
        }
        <div class="company-list">
          @for (company of companies(); track company.tenantMembershipId) {
            <button
              type="button"
              class="company-choice"
              [disabled]="busy()"
              (click)="choose(company.tenantMembershipId)"
            >
              <strong>{{ label(company.companyNameAr, company.companyNameEn) }}</strong>
              @if (company.hasActiveSubscription) {
                <span>subscription</span>
              }
            </button>
          }
        </div>
      </div>
    </div>
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
  protected readonly error = signal<BroochError | null>(null);

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected async choose(tenantMembershipId: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.selectCompanyService.selectCompany(tenantMembershipId),
      );
      if (isNavigableRedirect(response.redirectUrl)) {
        this.selectCompanyService.clearFlow();
        this.sso.navigate(response.redirectUrl);
        return;
      }
      this.selectCompanyService.clearFlow();
      await firstValueFrom(this.selectCompanyService.refreshSession());
      await this.router.navigate(['/']);
    } catch (err) {
      const failure = err as BroochError;
      if (isApplicationAccessDenied(failure) && isNavigableRedirect(failure.redirectUrl)) {
        this.selectCompanyService.clearFlow();
        this.sso.navigate(failure.redirectUrl);
        return;
      }
      this.error.set(failure);
    } finally {
      this.busy.set(false);
    }
  }
}
