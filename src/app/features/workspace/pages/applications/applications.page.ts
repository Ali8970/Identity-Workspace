import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ApplicationsService } from '../../services/applications.service';
import { ApplicationCard } from './application-card';
import { LauncherApplication, buildLauncherApps } from './application-catalogue';
import { ApplicationsSkeleton } from './applications.skeleton';

@Component({
  selector: 'app-applications-page',
  imports: [TranslatePipe, ApplicationsSkeleton, ApplicationCard],
  host: {
    '(window:pageshow)': 'onPageShow()',
    '(window:focus)': 'onPageShow()',
  },
  template: `
    <div class="flex flex-col gap-8">
      <header class="flex flex-wrap items-start justify-between gap-6">
        <div class="min-w-0 max-w-[680px] flex-1">
          <p class="m-0 text-xs leading-[18px] font-bold text-launcher-eyebrow">
            @if (companyLabel()) {
              {{ 'applications.workspace' | translate }} / {{ companyLabel() }}
            } @else {
              {{ 'applications.workspace' | translate }}
            }
          </p>
          <h1
            class="mt-2 mb-0 text-[2.375rem] leading-[1.25] font-normal tracking-[-0.025em] text-text max-w768:text-[1.75rem]"
            id="main-content-header"
            tabindex="-1"
          >
            {{ 'applications.title' | translate }}
          </h1>
          <p class="mt-2.5 mb-0 max-w-[656px] text-[15px] leading-[1.75] text-launcher-muted">
            {{ 'applications.subtitle' | translate }}
          </p>
        </div>

        <div
          class="flex w-full max-w-[308px] min-w-[260px] items-stretch rounded-2xl border-[1.468px] border-border-button bg-surface px-[15px] py-[13px] shadow-[var(--shadow-app-stats)] max-w480:max-w-none max-w480:min-w-0"
          dir="ltr"
        >
          <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span class="min-w-0 text-end">
              <span class="block text-[10px] leading-[15px] text-launcher-muted">
                {{ 'applications.all' | translate }}
              </span>
              <span class="block text-[13px] leading-[19.5px] font-bold text-text">
                {{ 'applications.count' | translate: { count: apps().length } }}
              </span>
            </span>
            <span
              class="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-launcher-icon-bg"
              aria-hidden="true"
            >
              <img src="/images/apps/icon-grid.svg" alt="" />
            </span>
          </div>
          <span class="mx-[13px] w-px self-stretch bg-border-button" aria-hidden="true"></span>
          <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span class="min-w-0 text-end">
              <span class="block text-[10px] leading-[15px] text-launcher-muted">
                {{ 'applications.available' | translate }}
              </span>
              <span class="block text-[13px] leading-[19.5px] font-bold text-text">
                {{ 'applications.availableCount' | translate: { count: availableCount() } }}
              </span>
            </span>
            <span
              class="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-launcher-available-bg"
              aria-hidden="true"
            >
              <img src="/images/apps/icon-check-stat.svg" alt="" />
            </span>
          </div>
        </div>
      </header>

      @if (justOnboarded()) {
        <div
          class="flex flex-wrap items-center gap-3 rounded-[10px] border-[1.468px] border-success bg-success-bg px-4 py-3 text-[13px] text-success-text"
          role="status"
        >
          {{ 'applications.justOnboarded' | translate }}
        </div>
      }

      @if (loading()) {
        <app-applications-skeleton [label]="'applications.loading' | translate" />
      } @else {
        <section
          class="rounded-[20px] border-[1.468px] border-border-button bg-launcher-panel p-6 max-w480:p-4"
          [attr.aria-label]="'applications.all' | translate"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <h2 class="m-0 text-lg leading-[27px] font-normal text-text">
                {{ 'applications.all' | translate }}
              </h2>
              <p class="m-0 text-xs leading-[18px] text-launcher-muted">
                {{ 'applications.count' | translate: { count: apps().length } }}
              </p>
            </div>
            <p
              class="m-0 flex items-center gap-1.5 text-xs leading-[18px] font-semibold text-launcher-available"
            >
              <span
                class="size-[7px] rounded-full bg-launcher-available shadow-[0_0_0_4px_var(--launcher-available-bg)]"
                aria-hidden="true"
              ></span>
              {{ 'applications.availableCount' | translate: { count: availableCount() } }}
            </p>
          </div>

          <div
            class="mt-[18px] grid grid-cols-3 gap-6 max-w1024:grid-cols-2 max-w480:grid-cols-1"
            role="list"
          >
            @for (app of apps(); track app.code) {
              <app-application-card
                [app]="app"
                [busy]="launching() === app.code"
                [blocked]="launching() !== null && launching() !== app.code"
                (launch)="onLaunch(app, $event)"
              />
            }
          </div>
        </section>
      }

      <aside
        class="flex items-center gap-3 rounded-xl border-[1.468px] border-border-button bg-surface px-[18px] py-[15px]"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-[10px] bg-launcher-icon-bg"
          aria-hidden="true"
        >
          <img src="/images/apps/icon-shield.svg" alt="" />
        </span>
        <span class="min-w-0">
          <span class="block text-[13px] leading-[19.5px] font-bold text-text">
            {{ 'applications.sessionTitle' | translate }}
          </span>
          <span class="block text-[11px] leading-[16.5px] text-launcher-muted">
            {{ 'applications.sessionBody' | translate }}
          </span>
        </span>
      </aside>
    </div>
  `,
})
export class ApplicationsPage {
  private readonly applicationsService = inject(ApplicationsService);
  private readonly session = inject(SessionStore);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);

  protected readonly justOnboarded = signal(
    this.route.snapshot.queryParamMap.get('onboarded') === '1',
  );

  protected readonly apps = computed(() =>
    buildLauncherApps(this.applicationsService.availableApplications(), (url) =>
      this.applicationsService.canLaunch(url),
    ),
  );
  protected readonly availableCount = computed(
    () => this.apps().filter((app) => app.active).length,
  );
  protected readonly loading = this.session.bootstrapping;
  protected readonly launching = signal<string | null>(null);

  protected readonly companyLabel = computed(() => {
    const company = this.session.currentCompany();
    if (company?.code) {
      return company.code;
    }
    const tenant = this.session.currentTenant();
    return tenant ? this.language.pick(tenant.nameAr, tenant.nameEn) : '';
  });

  protected onPageShow(): void {
    this.launching.set(null);
  }

  protected onLaunch(app: LauncherApplication, event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (this.launching() !== null || !app.launchable) {
      event.preventDefault();
      return;
    }

    this.launching.set(app.code);
  }
}
