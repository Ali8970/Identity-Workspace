import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { applicationModifier } from '../../../../shared/ui/display';
import { SessionStore } from '../../../../core/auth/session.store';
import { AvailableApplicationDto } from '../../../../models/auth.model';
import { ApplicationsService } from '../../services/applications.service';

@Component({
  selector: 'app-applications-page',
  imports: [TranslatePipe],
  host: {
    '(window:pageshow)': 'onPageShow()',
    '(window:focus)': 'onPageShow()',
  },
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'applications.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'applications.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'applications.subtitle' | translate }}</p>
        </div>

        @if (tenantName()) {
          <div class="workspace-page__meta">
            <span class="workspace-chip">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
              >
                <path d="M4 21V8l8-4 8 4v13" />
                <path d="M9 21V12h6v9" />
              </svg>
              {{ tenantName() }}
            </span>
            <span class="workspace-chip workspace-chip--muted">
              {{ 'applications.appCount' | translate: { count: apps().length } }}
            </span>
          </div>
        }
      </header>

      @if (justOnboarded()) {
        <div class="workspace-status workspace-status--success" role="status">
          <span class="workspace-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <span class="workspace-status__body">
            {{ 'applications.justOnboarded' | translate }}
          </span>
        </div>
      }

      @if (apps().length === 0) {
        <section class="workspace-empty" role="status">
          <div class="workspace-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <h2 class="workspace-empty__title">{{ 'applications.emptyTitle' | translate }}</h2>
          <p class="workspace-empty__body">{{ 'applications.emptyBody' | translate }}</p>
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
            >
              <div class="app-launcher-card__head">
                <span
                  class="app-launcher-card__icon"
                  [class]="'app-launcher-card__icon--' + applicationModifier(app.key)"
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
                } @else if (canLaunch(app.baseUrl) && app.baseUrl) {
                  <a
                    class="ui-btn ui-btn--primary app-launcher-card__action"
                    [href]="app.baseUrl"
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
                      >
                        <path
                          d="M14 4h6v6M10 14 20 4M15 9h-4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"
                        />
                      </svg>
                    }
                  </a>
                } @else {
                  <span class="workspace-chip workspace-chip--muted">
                    {{ 'applications.unavailable' | translate }}
                  </span>
                }
              </div>
            </article>
          }
        </div>
      }

      <aside class="workspace-note">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
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
  private readonly route = inject(ActivatedRoute);

  /** Exposed for the template — BEM modifier for the app tile. */
  protected readonly applicationModifier = applicationModifier;

  /** Set by the onboarding hand-off (`/applications?onboarded=1`) after a full reload. */
  protected readonly justOnboarded = signal(
    this.route.snapshot.queryParamMap.get('onboarded') === '1',
  );

  protected readonly apps = computed(() => this.applicationsService.availableApplications());
  protected readonly launching = signal<string | null>(null);
  protected readonly tenantName = computed(() => {
    const tenant = this.session.currentTenant();
    return tenant ? this.language.pick(tenant.nameAr, tenant.nameEn) : '';
  });

  protected canLaunch(baseUrl: string | null): boolean {
    return this.applicationsService.canLaunch(baseUrl);
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

    if (this.launching() !== null || !this.canLaunch(app.baseUrl)) {
      event.preventDefault();
      return;
    }

    this.launching.set(app.key);
  }
}
