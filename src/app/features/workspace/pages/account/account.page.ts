import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MyCompanyDto } from '../../../../models/auth.model';
import { nameInitials } from '../../../../shared/ui/display';
import { SessionDto } from '../../models/workspace-feature.model';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'app-account-page',
  imports: [TranslatePipe],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'account.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'account.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'account.subtitle' | translate }}</p>
        </div>

        @if (userInitial()) {
          <div class="workspace-page__meta">
            <span class="workspace-chip">
              <span class="workspace-profile__avatar" style="width:1.65rem;height:1.65rem;font-size:0.72rem;flex:0 0 1.65rem" aria-hidden="true">
                {{ userInitial() }}
              </span>
              {{ userEmail() }}
            </span>
          </div>
        }
      </header>

      @if (loading()) {
        <div class="workspace-loading" role="status" aria-live="polite">
          <span class="workspace-loading__spinner" aria-hidden="true"></span>
          <span>{{ 'account.loading' | translate }}</span>
        </div>
      } @else if (loadFailed()) {
        <section class="workspace-empty" role="status">
          <p class="workspace-empty__body">{{ 'common.loadFailed' | translate }}</p>
          <button type="button" class="ui-btn ui-btn--ghost" (click)="reload()">
            {{ 'common.retry' | translate }}
          </button>
        </section>
      } @else {
        <div class="workspace-account-stack">
          <section class="workspace-panel" aria-labelledby="account-profile-heading">
            <header class="workspace-panel__head">
              <h2 class="workspace-panel__title" id="account-profile-heading">
                {{ 'account.profile' | translate }}
              </h2>
              <p class="workspace-panel__lead">{{ 'account.profileLead' | translate }}</p>
            </header>

            <div class="workspace-panel__body">
              @if (session.current(); as me) {
                <div class="workspace-profile">
                  <span class="workspace-profile__avatar" aria-hidden="true">{{ userInitial() }}</span>
                  <div class="workspace-profile__details">
                    <dl class="workspace-dl">
                      <div class="workspace-dl__row">
                        <dt class="workspace-dl__label">{{ 'account.email' | translate }}</dt>
                        <dd class="workspace-dl__value">{{ me.user.email }}</dd>
                      </div>
                      <div class="workspace-dl__row">
                        <dt class="workspace-dl__label">{{ 'account.name' | translate }}</dt>
                        <dd class="workspace-dl__value">
                          {{ language.pick(me.user.nameAr, me.user.nameEn) }}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="workspace-panel" aria-labelledby="account-companies-heading">
            <header class="workspace-panel__head">
              <h2 class="workspace-panel__title" id="account-companies-heading">
                {{ 'account.companies' | translate }}
              </h2>
              <p class="workspace-panel__lead">{{ 'account.companiesLead' | translate }}</p>
            </header>

            <div class="workspace-panel__body">
              @if (companies().length === 0) {
                <p class="workspace-panel__empty" role="status">{{ 'account.noCompanies' | translate }}</p>
              } @else {
                <div class="workspace-company-list" role="list">
                  @for (company of companies(); track company.tenantMembershipId) {
                    <article
                      class="workspace-company-row"
                      role="listitem"
                      [class.workspace-company-row--current]="company.isCurrent"
                    >
                      <div class="workspace-company-row__body">
                        <strong class="workspace-company-row__name">
                          {{ language.pick(company.companyNameAr, company.companyNameEn) }}
                        </strong>
                        <div class="workspace-company-row__meta">
                          @if (company.isCurrent) {
                            <span class="workspace-role-pill">{{ 'account.current' | translate }}</span>
                          }
                          @if (company.isOwner) {
                            <span class="workspace-member__owner">{{ 'account.owner' | translate }}</span>
                          }
                          @if (company.isPrimary) {
                            <span class="workspace-chip workspace-chip--muted">
                              {{ 'account.primary' | translate }}
                            </span>
                          }
                        </div>
                        @if (company.jobTitle) {
                          <span class="workspace-company-row__job">{{ company.jobTitle }}</span>
                        }
                      </div>

                      @if (!company.isCurrent && company.isSelectable) {
                        <button
                          type="button"
                          class="ui-btn ui-btn--primary"
                          [disabled]="switching()"
                          [attr.aria-busy]="switching()"
                          (click)="switchTo(company.tenantMembershipId)"
                        >
                          {{ 'account.switch' | translate }}
                        </button>
                      } @else if (!company.isSelectable && !company.isCurrent) {
                        <span class="workspace-chip workspace-chip--muted">
                          {{ 'account.unavailable' | translate }}
                        </span>
                      }
                    </article>
                  }
                </div>
              }
            </div>
          </section>

          <section class="workspace-panel" aria-labelledby="account-sessions-heading">
            <header class="workspace-panel__head">
              <h2 class="workspace-panel__title" id="account-sessions-heading">
                {{ 'account.sessions' | translate }}
              </h2>
              <p class="workspace-panel__lead">{{ 'account.sessionsLead' | translate }}</p>
            </header>

            <div class="workspace-panel__body">
              @if (sessions().length === 0) {
                <p class="workspace-panel__empty" role="status">{{ 'account.noSessions' | translate }}</p>
              } @else {
                <ul class="workspace-session-list">
                  @for (row of sessions(); track row.sessionRef) {
                    <li class="workspace-session-row">
                      <span class="workspace-session-row__body">
                        <span class="workspace-session-row__id">{{ row.sessionRef }}</span>
                        <span class="workspace-session-row__label">
                          {{ 'account.sessionLabel' | translate }}
                        </span>
                      </span>
                      @if (isKnownSessionStage(row.stage)) {
                        <span [class]="sessionStageClass(row.stage)">
                          {{ sessionStageLabel(row.stage) | translate }}
                        </span>
                      } @else {
                        <span class="workspace-status-pill">{{ row.stage }}</span>
                      }
                    </li>
                  }
                </ul>
              }

              <div class="workspace-actions">
                <button
                  type="button"
                  class="ui-btn ui-btn--ghost"
                  [disabled]="busy()"
                  [attr.aria-busy]="busy()"
                  (click)="logout()"
                >
                  {{ 'account.logout' | translate }}
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--danger"
                  [disabled]="busy()"
                  [attr.aria-busy]="busy()"
                  (click)="logoutAll()"
                >
                  {{ 'account.logoutAll' | translate }}
                </button>
              </div>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class AccountPage {
  private readonly accountService = inject(AccountService);
  protected readonly language = inject(LanguageService);
  /** Injected directly rather than reached through AccountService. */
  protected readonly session = inject(SessionStore);

  private readonly accountData = rxResource({
    // Keyed on the active company: `isCurrent` on the company rows changes with it.
    params: () => this.session.currentTenant()?.tenantMembershipId,
    stream: () => this.accountService.loadAccountData(),
    defaultValue: { companies: [], sessions: [] } as {
      companies: MyCompanyDto[];
      sessions: SessionDto[];
    },
  });

  protected readonly companies = computed(() => this.accountData.value().companies);
  protected readonly sessions = computed(() => this.accountData.value().sessions);
  protected readonly loading = this.accountData.isLoading;
  /** The error interceptor already raised the banner; this only offers the retry. */
  protected readonly loadFailed = computed(() => this.accountData.status() === 'error');

  protected readonly busy = signal(false);
  protected readonly switching = signal(false);

  protected readonly userEmail = computed(() => this.session.current()?.user.email ?? '');
  protected readonly userInitial = computed(() => {
    const me = this.session.current()?.user;
    return me ? nameInitials(this.language.pick(me.nameAr, me.nameEn), me.email) : '';
  });

  protected reload(): void {
    this.accountData.reload();
  }

  protected isKnownSessionStage(stage: string): boolean {
    return ['Active', 'Selection', 'Anonymous'].includes(stage);
  }

  protected sessionStageLabel(stage: string): string {
    return `account.sessionStage.${stage}`;
  }

  protected sessionStageClass(stage: string): string {
    const normalized = stage.toLowerCase();
    if (normalized === 'active') {
      return 'workspace-status-pill workspace-status-pill--active';
    }
    if (normalized === 'selection') {
      return 'workspace-status-pill workspace-status-pill--pending';
    }
    return 'workspace-status-pill';
  }

  protected async switchTo(tenantMembershipId: string): Promise<void> {
    this.switching.set(true);
    try {
      await firstValueFrom(this.accountService.switchCompany(tenantMembershipId));
      this.accountData.reload();
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
