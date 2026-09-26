import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MyCompanyDto } from '../../../../models/auth.model';
import { BusyOverlay } from '../../../../shared/ui/busy-overlay/busy-overlay';
import { nameInitials } from '../../../../shared/ui/display';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { PanelSection } from '../../../../shared/ui/panel-section/panel-section';
import { SessionDto } from '../../models/workspace-feature.model';
import { AccountService } from '../../services/account.service';
import { AccountSkeleton } from './account.skeleton';

@Component({
  selector: 'app-account-page',
  imports: [
    TranslatePipe,
    AccountSkeleton,
    BusyOverlay,
    PageHeader,
    ListStats,
    PanelSection,
    EmptyState,
    ErrorPanel,
  ],
  template: `
    <div>
      <app-page-header
        [title]="'account.title' | translate"
        [description]="'account.subtitle' | translate"
      />

      <div class="mb-4">
        <app-list-stats [stats]="accountStats()" [loading]="loading()" />
      </div>

      @if (loading()) {
        <app-account-skeleton [label]="'account.loading' | translate" />
      } @else if (loadFailed()) {
        <app-error-panel
          [title]="'common.loadFailed' | translate"
          [retryLabel]="'common.retry' | translate"
          (retry)="reload()"
        />
      } @else {
        <div class="flex flex-col gap-4">
          <app-panel-section
            [title]="'account.profile' | translate"
            [description]="'account.profileLead' | translate"
          >
            @if (session.current(); as me) {
              <div class="flex items-start gap-4">
                <span
                  class="grid size-14 shrink-0 place-items-center rounded-2xl text-[18px] font-bold text-on-primary"
                  style="background: var(--primary-gradient)"
                  aria-hidden="true"
                  >{{ userInitial() }}</span
                >
                <dl class="m-0 grid min-w-0 flex-1 gap-3">
                  <div>
                    <dt class="m-0 text-[11px] font-semibold text-text-muted">
                      {{ 'account.email' | translate }}
                    </dt>
                    <dd class="mt-1 mb-0 text-[13px] font-semibold text-text ltr-text">
                      {{ me.user.email }}
                    </dd>
                  </div>
                  <div>
                    <dt class="m-0 text-[11px] font-semibold text-text-muted">
                      {{ 'account.name' | translate }}
                    </dt>
                    <dd class="mt-1 mb-0 text-[13px] font-semibold text-text">
                      {{ language.pick(me.user.nameAr, me.user.nameEn) }}
                    </dd>
                  </div>
                </dl>
              </div>
            }
          </app-panel-section>

          <app-panel-section
            [title]="'account.companies' | translate"
            [description]="'account.companiesLead' | translate"
          >
            @if (companies().length === 0) {
              <app-empty-state [title]="'account.noCompanies' | translate" />
            } @else {
              <ul class="m-0 flex list-none flex-col gap-2 p-0" role="list">
                @for (company of companies(); track company.tenantMembershipId) {
                  <li
                    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border-[1.468px] border-border-button bg-surface px-3 py-3"
                    [class.border-info]="company.isCurrent"
                    [class.bg-primary-light]="company.isCurrent"
                    role="listitem"
                  >
                    <div class="min-w-0">
                      <strong class="block text-[13px] font-semibold text-text">
                        {{ language.pick(company.companyNameAr, company.companyNameEn) }}
                      </strong>
                      <div class="mt-1 flex flex-wrap gap-1.5">
                        @if (company.isCurrent) {
                          <span
                            class="rounded-md bg-info px-1.5 py-0.5 text-[11px] font-semibold text-on-primary"
                            >{{ 'account.current' | translate }}</span
                          >
                        }
                        @if (company.isOwner) {
                          <span
                            class="rounded-md bg-primary-light px-1.5 py-0.5 text-[11px] font-semibold text-info-text"
                            >{{ 'account.owner' | translate }}</span
                          >
                        }
                        @if (company.isPrimary) {
                          <span
                            class="rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-text-muted"
                            >{{ 'account.primary' | translate }}</span
                          >
                        }
                      </div>
                      @if (company.jobTitle) {
                        <span class="mt-1 block text-[12px] text-text-muted">{{
                          company.jobTitle
                        }}</span>
                      }
                    </div>

                    @if (!company.isCurrent && company.isSelectable) {
                      <button
                        type="button"
                        class="btn-primary inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:opacity-50"
                        [disabled]="switching()"
                        [attr.aria-busy]="switching()"
                        (click)="switchTo(company.tenantMembershipId)"
                      >
                        {{ 'account.switch' | translate }}
                      </button>
                    } @else if (!company.isSelectable && !company.isCurrent) {
                      <span
                        class="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted"
                        >{{ 'account.unavailable' | translate }}</span
                      >
                    }
                  </li>
                }
              </ul>
            }
          </app-panel-section>

          <app-panel-section
            [title]="'account.sessions' | translate"
            [description]="'account.sessionsLead' | translate"
          >
            @if (sessions().length === 0) {
              <app-empty-state [title]="'account.noSessions' | translate" />
            } @else {
              <ul class="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                @for (row of sessions(); track row.sessionRef) {
                  <li
                    class="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[1.468px] border-border-subtle px-3 py-2.5"
                  >
                    <span class="min-w-0">
                      <span class="block truncate text-[13px] font-semibold text-text ltr-text">{{
                        row.sessionRef
                      }}</span>
                      <span class="text-[12px] text-text-muted">{{
                        'account.sessionLabel' | translate
                      }}</span>
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

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="inline-flex h-9 cursor-pointer items-center rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text disabled:opacity-50"
                [disabled]="busy()"
                [attr.aria-busy]="busy()"
                (click)="logout()"
              >
                {{ 'account.logout' | translate }}
              </button>
              <button
                type="button"
                class="inline-flex h-9 cursor-pointer items-center rounded-lg border-0 bg-error px-3.5 text-[13px] font-semibold text-on-primary disabled:opacity-50"
                [disabled]="busy()"
                [attr.aria-busy]="busy()"
                (click)="logoutAll()"
              >
                {{ 'account.logoutAll' | translate }}
              </button>
            </div>
          </app-panel-section>
        </div>
      }
    </div>

    @if (blockingMessageKey(); as messageKey) {
      <app-busy-overlay [messageKey]="messageKey" />
    }
  `,
})
export class AccountPage {
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  protected readonly session = inject(SessionStore);

  private readonly accountData = rxResource({
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
  protected readonly loadFailed = computed(() => this.accountData.status() === 'error');
  protected readonly busy = signal(false);
  protected readonly switching = signal(false);

  protected readonly blockingMessageKey = computed(() => {
    if (this.busy()) {
      return 'shell.signingOut';
    }
    return this.switching() ? 'shell.switchingCompany' : null;
  });

  protected readonly userEmail = computed(() => this.session.current()?.user.email ?? '');
  protected readonly userInitial = computed(() => {
    const me = this.session.current()?.user;
    return me ? nameInitials(this.language.pick(me.nameAr, me.nameEn), me.email) : '';
  });

  protected readonly accountStats = computed((): ListStatCard[] => {
    this.language.current();
    return [
      {
        label: this.translate.instant('account.stats.companies'),
        value: this.companies().length,
        accent: '#2b5bf9',
        icon: 'apps',
      },
      {
        label: this.translate.instant('account.stats.sessions'),
        value: this.sessions().length,
        accent: '#1e00b0',
        icon: 'info',
      },
    ];
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
    await this.signOut(() => this.accountService.logout());
  }

  protected async logoutAll(): Promise<void> {
    await this.signOut(() => this.accountService.logoutAll());
  }

  private async signOut(request: () => Observable<unknown>): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(request());
      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch {
      this.busy.set(false);
    }
  }
}
