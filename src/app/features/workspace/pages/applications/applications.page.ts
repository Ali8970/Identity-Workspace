import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AvailableApplicationDto } from '../../../../models/auth.model';
import { applicationModifier } from '../../../../shared/ui/display';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ApplicationsService } from '../../services/applications.service';
import { ApplicationsSkeleton } from './applications.skeleton';

@Component({
  selector: 'app-applications-page',
  imports: [TranslatePipe, ApplicationsSkeleton, PageHeader, ListStats, EmptyState],
  host: {
    '(window:pageshow)': 'onPageShow()',
    '(window:focus)': 'onPageShow()',
  },
  template: `
    <div>
      <app-page-header
        [title]="'applications.title' | translate"
        [description]="'applications.subtitle' | translate"
      />

      <div class="mb-4">
        <app-list-stats [stats]="applicationStats()" [loading]="loading()" />
      </div>

      @if (justOnboarded()) {
        <div
          class="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border-[1.468px] border-success bg-success-bg px-4 py-3 text-[13px] text-success-text"
          role="status"
        >
          {{ 'applications.justOnboarded' | translate }}
        </div>
      }

      @if (loading()) {
        <app-applications-skeleton [label]="'applications.loading' | translate" />
      } @else if (apps().length === 0) {
        <section
          class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
        >
          <app-empty-state
            [title]="'applications.emptyTitle' | translate"
            [detail]="'applications.emptyBody' | translate"
          />
        </section>
      } @else {
        <div
          class="app-launcher-grid"
          role="list"
          [attr.aria-label]="'applications.title' | translate"
        >
          @for (app of apps(); track app.key) {
            <article
              class="app-launcher-card"
              role="listitem"
              [class.app-launcher-card--current]="app.isCurrent"
              [class.app-launcher-card--locked]="isLocked(app)"
            >
              <div class="app-launcher-card__head">
                <span
                  [class]="
                    'app-launcher-card__icon app-launcher-card__icon--' +
                    applicationModifier(app.key)
                  "
                  aria-hidden="true"
                >
                  @switch (app.key) {
                    @case ('account') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                        <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                      </svg>
                    }
                    @case ('crm') {
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="3.5" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    }
                    @case ('hr') {
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <rect x="3" y="7" width="18" height="13" rx="2" />
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M12 12v3M9 12h6" />
                      </svg>
                    }
                    @default {
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                      </svg>
                    }
                  }
                </span>
                <div class="app-launcher-card__body">
                  <h2 class="app-launcher-card__name">
                    {{ language.pick(app.nameAr, app.nameEn) }}
                  </h2>
                  <p class="app-launcher-card__key">{{ app.key }}</p>
                </div>
              </div>

              <div class="app-launcher-card__foot">
                @if (app.isCurrent) {
                  <span class="app-launcher-card__badge">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="m5 12 5 5L19 7" />
                    </svg>
                    {{ 'applications.current' | translate }}
                  </span>
                } @else if (canLaunch(app.url)) {
                  <a
                    class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary no-underline"
                    [href]="app.url"
                    rel="noopener"
                    [attr.aria-busy]="launching() === app.key || null"
                    [attr.aria-disabled]="
                      launching() !== null && launching() !== app.key ? true : null
                    "
                    (click)="onLaunch(app, $event)"
                  >
                    @if (launching() === app.key) {
                      {{ 'applications.opening' | translate }}
                    } @else {
                      {{ 'applications.open' | translate }}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        aria-hidden="true"
                        class="size-4"
                      >
                        <path
                          d="M14 4h6v6M10 14 20 4M15 9h-4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"
                        />
                      </svg>
                    }
                  </a>
                } @else {
                  <span class="app-launcher-card__locked">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.9"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
                      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                    </svg>
                    {{ 'applications.unavailable' | translate }}
                  </span>
                }
              </div>
            </article>
          }
        </div>
      }

      <aside
        class="mt-4 flex items-start gap-2.5 rounded-[10px] border-[1.468px] border-border-subtle bg-surface-muted px-4 py-3 text-[13px] leading-normal text-text-muted"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
          class="mt-0.5 size-4 shrink-0 text-info"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7h.01" />
        </svg>
        <span>{{ 'applications.ssoHint' | translate }}</span>
      </aside>
    </div>
  `,
})
export class ApplicationsPage {
  private readonly applicationsService = inject(ApplicationsService);
  private readonly session = inject(SessionStore);
  protected readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);

  protected readonly applicationModifier = applicationModifier;

  protected readonly justOnboarded = signal(
    this.route.snapshot.queryParamMap.get('onboarded') === '1',
  );

  protected readonly apps = computed(() => this.applicationsService.availableApplications());
  protected readonly loading = this.session.bootstrapping;
  protected readonly launching = signal<string | null>(null);

  protected readonly applicationStats = computed((): ListStatCard[] => {
    this.language.current();
    const rows = this.apps();
    const launchable = rows.filter((app) => this.canLaunch(app.url)).length;
    const locked = rows.filter((app) => this.isLocked(app)).length;
    return [
      {
        label: this.translate.instant('applications.stats.total'),
        value: rows.length,
        accent: '#2b5bf9',
        icon: 'apps',
      },
      {
        label: this.translate.instant('applications.stats.available'),
        value: launchable,
        accent: '#0fbc15',
        icon: 'active',
      },
      {
        label: this.translate.instant('applications.stats.unavailable'),
        value: locked,
        accent: '#f57c00',
        icon: 'warning',
        valueTone: locked > 0 ? 'danger' : 'default',
      },
    ];
  });

  protected canLaunch(url: string | null | undefined): boolean {
    return this.applicationsService.canLaunch(url);
  }

  protected isLocked(app: AvailableApplicationDto): boolean {
    return !app.isCurrent && !this.canLaunch(app.url);
  }

  protected onPageShow(): void {
    this.launching.set(null);
  }

  protected onLaunch(app: AvailableApplicationDto, event: MouseEvent): void {
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

    if (this.launching() !== null || !this.canLaunch(app.url)) {
      event.preventDefault();
      return;
    }

    this.launching.set(app.key);
  }
}
