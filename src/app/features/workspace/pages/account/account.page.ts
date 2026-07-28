import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { BroochError } from '../../../../core/error/brooch-error.model';
import { MyCompanyDto } from '../../../../models/auth.model';
import { SessionRowDto } from '../../models/workspace-feature.model';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'app-account-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="page-title" id="main-content-header" tabindex="-1">
      {{ 'account.title' | translate }}
    </h1>
    <p class="page-lead">{{ 'account.subtitle' | translate }}</p>

    @if (error()) {
      <div class="ui-alert ui-alert--error" role="alert">{{ error()!.message }}</div>
    }

    <section class="ui-card" style="margin-bottom:1rem">
      <h2 class="page-title" style="font-size:1.05rem">{{ 'account.profile' | translate }}</h2>
      @if (session.current(); as me) {
        <p><strong>{{ 'account.email' | translate }}:</strong> {{ me.user.email }}</p>
        <p>
          <strong>{{ 'account.name' | translate }}:</strong>
          {{ label(me.user.nameAr, me.user.nameEn) }}
        </p>
      }
    </section>

    <section class="ui-card" style="margin-bottom:1rem">
      <h2 class="page-title" style="font-size:1.05rem">{{ 'account.companies' | translate }}</h2>
      <ul class="perm-tree">
        @for (company of companies(); track company.tenantMembershipId) {
          <li style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap">
            <span>
              {{ label(company.companyNameAr, company.companyNameEn) }}
              @if (company.isCurrent) {
                <span class="ui-badge">{{ 'account.current' | translate }}</span>
              }
            </span>
            @if (!company.isCurrent && company.isSelectable) {
              <button
                type="button"
                class="ui-btn ui-btn--ghost"
                [disabled]="switching()"
                (click)="switchTo(company.tenantMembershipId)"
              >
                {{ 'account.switch' | translate }}
              </button>
            }
          </li>
        }
      </ul>
    </section>

    <section class="ui-card" style="margin-bottom:1rem">
      <h2 class="page-title" style="font-size:1.05rem">{{ 'account.sessions' | translate }}</h2>
      <ul class="perm-tree">
        @for (row of sessions(); track $index) {
          <li>{{ row.id }} · {{ row.stage }}</li>
        }
      </ul>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem">
        <button type="button" class="ui-btn ui-btn--ghost" [disabled]="busy()" (click)="logout()">
          {{ 'account.logout' | translate }}
        </button>
        <button type="button" class="ui-btn ui-btn--danger" [disabled]="busy()" (click)="logoutAll()">
          {{ 'account.logoutAll' | translate }}
        </button>
      </div>
    </section>
  `,
})
export class AccountPage {
  private readonly accountService = inject(AccountService);
  protected readonly session = this.accountService.sessionStore;
  private readonly language = inject(LanguageService);

  protected readonly companies = signal<MyCompanyDto[]>([]);
  protected readonly sessions = signal<SessionRowDto[]>([]);
  protected readonly error = signal<BroochError | null>(null);
  protected readonly busy = signal(false);
  protected readonly switching = signal(false);

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  private async load(): Promise<void> {
    try {
      const { companies, sessions } = await firstValueFrom(this.accountService.loadAccountData());
      this.companies.set(companies);
      this.sessions.set(sessions);
    } catch (err) {
      this.error.set(err as BroochError);
    }
  }

  protected async switchTo(tenantMembershipId: string): Promise<void> {
    this.switching.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.accountService.switchCompany(tenantMembershipId));
      await this.load();
    } catch (err) {
      this.error.set(err as BroochError);
    } finally {
      this.switching.set(false);
    }
  }

  protected async logout(): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.accountService.logout());
      window.location.assign('/login');
    } finally {
      this.busy.set(false);
    }
  }

  protected async logoutAll(): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.accountService.logoutAll());
      window.location.assign('/login');
    } finally {
      this.busy.set(false);
    }
  }
}
