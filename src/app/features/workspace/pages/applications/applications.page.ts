import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApplicationsService } from '../../services/applications.service';
import { ApplicationCard } from './application-card';
import {
  LauncherApplication,
  buildLauncherApps,
  isDeveloperPersona,
} from './application-catalogue';
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
          <h1
            class="m-0 text-[38px] leading-[47.5px] font-normal tracking-[-0.95px] text-text max-w768:text-[1.75rem] max-w768:leading-normal"
            id="main-content-header"
            tabindex="-1"
          >
            {{ 'applications.title' | translate }}
          </h1>
          <p class="mt-2.5 mb-0 max-w-[656px] text-[15px] leading-[26.25px] text-launcher-muted">
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
              class="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-launcher-icon-bg text-launcher-eyebrow"
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 14.8014 14.8014" fill="none">
                <path
                  d="M1.62262 0.672793H4.47209C4.99667 0.672793 5.42192 1.09804 5.42192 1.62262V4.47209C5.42192 4.99667 4.99667 5.42192 4.47209 5.42192H1.62262C1.09804 5.42192 0.672793 4.99667 0.672793 4.47209V1.62262C0.672793 1.09804 1.09804 0.672793 1.62262 0.672793Z"
                  stroke="currentColor"
                  stroke-width="1.34559"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.3293 0.672793H13.1788C13.7034 0.672793 14.1286 1.09804 14.1286 1.62262V4.47209C14.1286 4.99667 13.7034 5.42192 13.1788 5.42192H10.3293C9.80477 5.42192 9.37952 4.99667 9.37952 4.47209V1.62262C9.37952 1.09804 9.80477 0.672793 10.3293 0.672793Z"
                  stroke="currentColor"
                  stroke-width="1.34559"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M1.62262 9.37952H4.47209C4.99667 9.37952 5.42192 9.80477 5.42192 10.3293V13.1788C5.42192 13.7034 4.99667 14.1286 4.47209 14.1286H1.62262C1.09804 14.1286 0.672793 13.7034 0.672793 13.1788V10.3293C0.672793 9.80477 1.09804 9.37952 1.62262 9.37952Z"
                  stroke="currentColor"
                  stroke-width="1.34559"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.3293 9.37952H13.1788C13.7034 9.37952 14.1286 9.80477 14.1286 10.3293V13.1788C14.1286 13.7034 13.7034 14.1286 13.1788 14.1286H10.3293C9.80477 14.1286 9.37952 13.7034 9.37952 13.1788V10.3293C9.37952 9.80477 9.80477 9.37952 10.3293 9.37952Z"
                  stroke="currentColor"
                  stroke-width="1.34559"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
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
              class="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-launcher-available-bg text-launcher-available"
              aria-hidden="true"
            >
              <svg width="13" height="10" viewBox="0 0 12.4269 9.26079" fill="none">
                <path
                  d="M0.672793 5.42192L3.83888 8.588L11.7541 0.672793"
                  stroke="currentColor"
                  stroke-width="1.34559"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
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
          class="rounded-[20px] border-[1.447px] border-[#e7eaf0] bg-launcher-panel p-6 max-w480:p-4"
          [attr.aria-label]="'applications.all' | translate"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <h2 class="m-0 text-[18px] leading-[27px] font-normal text-[#142032] dark:text-text">
                {{ 'applications.all' | translate }}
              </h2>
              <p class="m-0 text-[12px] leading-[18px] text-launcher-muted">
                {{ 'applications.count' | translate: { count: apps().length } }}
              </p>
            </div>
            <p
              class="m-0 flex items-center gap-1.5 text-[12px] leading-[18px] font-semibold text-launcher-available"
            >
              <span
                class="size-[7px] rounded-[3.5px] bg-launcher-available shadow-[0_0_0_4px_var(--launcher-available-bg)]"
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
  private readonly route = inject(ActivatedRoute);

  protected readonly justOnboarded = signal(
    this.route.snapshot.queryParamMap.get('onboarded') === '1',
  );

  protected readonly apps = computed(() => {
    const available = this.applicationsService.availableApplications();
    const me = this.session.current();
    const developer = isDeveloperPersona({
      roles: me?.roles ?? [],
      permissions: me?.permissions ?? [],
      availableApplications: available,
    });
    return buildLauncherApps(
      available,
      (url) => this.applicationsService.canLaunch(url),
      { developer },
    );
  });
  protected readonly availableCount = computed(
    () => this.apps().filter((app) => app.active).length,
  );
  protected readonly loading = this.session.bootstrapping;
  protected readonly launching = signal<string | null>(null);

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
