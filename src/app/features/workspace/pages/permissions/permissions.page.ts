import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  humanizePermissionToken,
  permissionActionLabel,
  permissionScopeLabel,
} from '../../../../core/i18n/permission-label';
import { LanguageService } from '../../../../core/i18n/language.service';
import { applicationModifier } from '../../../../shared/ui/display';
import { Disclosure } from '../../../../shared/ui/disclosure/disclosure';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { PermissionCatalogItem } from '../../models/workspace-feature.model';
import { PermissionsService } from '../../services/permissions.service';
import { PermissionsSkeleton } from './permissions.skeleton';

@Component({
  selector: 'app-permissions-page',
  imports: [
    TranslatePipe,
    PermissionsSkeleton,
    PageHeader,
    ListStats,
    Disclosure,
    EmptyState,
    ErrorPanel,
  ],
  template: `
    <div>
      <app-page-header
        [title]="'permissions.title' | translate"
        [description]="'permissions.subtitle' | translate"
      />

      <div class="mb-4">
        <app-list-stats [stats]="permissionStats()" [loading]="loading()" />
      </div>

      <aside
        class="mb-4 flex items-start gap-2.5 rounded-[10px] border-[1.468px] border-border-subtle bg-surface-muted px-4 py-3 text-[13px] leading-normal text-text-muted"
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
        <span>{{ 'permissions.catalogHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <app-permissions-skeleton [label]="'permissions.loading' | translate" />
      } @else if (loadFailed()) {
        <app-error-panel
          [title]="'common.loadFailed' | translate"
          [retryLabel]="'common.retry' | translate"
          (retry)="reload()"
        />
      } @else if (items().length === 0) {
        <section
          class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
        >
          <app-empty-state
            [title]="'permissions.emptyTitle' | translate"
            [detail]="'permissions.emptyBody' | translate"
          />
        </section>
      } @else {
        <div class="relative mb-4">
          <span
            class="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          >
            <svg width="15" height="15" viewBox="0 0 14 16" fill="none">
              <circle cx="6" cy="6" r="4.25" stroke="currentColor" stroke-width="1.5" />
              <path d="M9.2 9.8 12 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <input
            type="search"
            class="list-filter-control h-10 w-full rounded-lg border-[1.468px] border-border-button bg-surface ps-[42px] pe-3 text-[13px] text-text outline-none placeholder:text-text-muted focus:border-border-button focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
            [value]="search()"
            [placeholder]="'permissions.search' | translate"
            [attr.aria-label]="'permissions.search' | translate"
            autocomplete="off"
            (input)="search.set($any($event.target).value)"
          />
        </div>

        @if (visibleApplications().length === 0) {
          <section
            class="overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
          >
            <app-empty-state
              [title]="'permissions.noMatches' | translate: { term: search().trim() }"
            />
          </section>
        } @else {
        <div class="flex flex-col gap-4">
          @for (appGroup of visibleApplications(); track appGroup.applicationKey) {
            <section
              class="overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
              [attr.aria-labelledby]="'permissions-app-' + appGroup.applicationKey"
            >
              <header
                class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3"
              >
                <h2
                  class="m-0 inline-flex min-w-0 items-center gap-2.5 text-[13px] font-semibold text-text"
                  [id]="'permissions-app-' + appGroup.applicationKey"
                >
                  <span
                    [class]="
                      'grid size-7 shrink-0 place-items-center rounded-md bg-primary-light text-info workspace-app-group__icon--' +
                      applicationModifier(appGroup.applicationKey)
                    "
                    aria-hidden="true"
                  >
                    @switch (appGroup.applicationKey) {
                      @case ('account') {
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                          class="size-3.5"
                        >
                          <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                        </svg>
                      }
                      @case ('crm') {
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                          class="size-3.5"
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
                          class="size-3.5"
                        >
                          <rect x="3" y="7" width="18" height="13" rx="2" />
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      }
                      @default {
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                          class="size-3.5"
                        >
                          <rect x="3" y="3" width="7" height="7" rx="1.5" />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        </svg>
                      }
                    }
                  </span>
                  {{ appLabel(appGroup.applicationKey) }}
                </h2>
                <span
                  class="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted"
                >
                  {{
                    'permissions.groupPermissionCount'
                      | translate: { count: appGroup.permissionCount }
                  }}
                </span>
              </header>

              <div>
                @for (group of appGroup.groups; track group.name) {
                  <app-disclosure
                    [heading]="groupLabel(group.name)"
                    [countLabel]="'' + group.items.length"
                    [forceOpen]="searching()"
                  >
                    <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                      @for (item of group.items; track item.key) {
                        <li>
                          <span
                            class="inline-flex max-w-full rounded-md border-[1.468px] border-border-subtle bg-surface-muted px-2.5 py-1 text-[12.5px] font-medium leading-snug text-text"
                            [attr.title]="item.key"
                          >
                            {{ permissionName(item) }}
                          </span>
                        </li>
                      }
                    </ul>
                  </app-disclosure>
                }
              </div>
            </section>
          }
        </div>
        }
      }
    </div>
  `,
})
export class PermissionsPage {
  private readonly permissionsService = inject(PermissionsService);
  protected readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  /** Exposed for the template — BEM modifier for the app tile. */
  protected readonly applicationModifier = applicationModifier;

  private readonly catalog = rxResource({
    stream: () => this.permissionsService.loadCatalog(),
    defaultValue: [] as PermissionCatalogItem[],
  });

  protected readonly items = this.catalog.value;
  protected readonly loading = this.catalog.isLoading;
  protected readonly search = signal('');
  protected readonly searching = computed(() => this.search().trim().length > 0);
  /** The error interceptor already raised the banner; this only offers the retry. */
  protected readonly loadFailed = computed(() => this.catalog.status() === 'error');

  protected readonly permissionStats = computed((): ListStatCard[] => {
    this.language.current();
    const apps = this.applicationGroups();
    return [
      {
        label: this.translate.instant('permissions.stats.total'),
        value: this.items().length,
        accent: '#2b5bf9',
        icon: 'values',
      },
      {
        label: this.translate.instant('permissions.stats.applications'),
        value: apps.length,
        accent: '#1e00b0',
        icon: 'apps',
      },
      {
        label: this.translate.instant('permissions.stats.groups'),
        value: apps.reduce((total, app) => total + app.groups.length, 0),
        accent: '#0fbc15',
        icon: 'info',
      },
    ];
  });

  protected readonly applicationGroups = computed(() => {
    const byApp = new Map<string, Map<string, PermissionCatalogItem[]>>();

    // A permission is a global definition; applicationKeys lists every application
    // allowed to offer it, so one entry can appear under several apps. Within an
    // app we group by `resource`, the middle segment of module.resource.action.
    for (const item of this.items()) {
      for (const applicationKey of item.applicationKeys) {
        const groups = byApp.get(applicationKey) ?? new Map<string, PermissionCatalogItem[]>();
        const list = groups.get(item.resource) ?? [];
        list.push(item);
        groups.set(item.resource, list);
        byApp.set(applicationKey, groups);
      }
    }

    return [...byApp.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([applicationKey, groupsMap]) => {
        const groups = [...groupsMap.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, groupItems]) => ({
            name,
            items: groupItems.sort((left, right) => left.key.localeCompare(right.key)),
          }));

        return {
          applicationKey,
          groups,
          permissionCount: groups.reduce((total, group) => total + group.items.length, 0),
        };
      });
  });

  /** Search narrows the catalogue. Matching groups open while a search is active. */
  protected readonly visibleApplications = computed(() => {
    this.language.current();
    const term = this.search().trim().toLowerCase();
    const locale = this.language.current();
    return this.applicationGroups()
      .map((app) => {
        const groups = app.groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
              if (!term) {
                return true;
              }
              return [this.permissionName(item), item.key, this.groupLabel(group.name), app.applicationKey]
                .join(' ')
                .toLowerCase()
                .includes(term);
            }),
          }))
          .filter((group) => group.items.length > 0)
          .sort((left, right) =>
            this.groupLabel(left.name).localeCompare(this.groupLabel(right.name), locale),
          );
        return {
          ...app,
          groups,
          permissionCount: groups.reduce((total, group) => total + group.items.length, 0),
        };
      })
      .filter((app) => app.groups.length > 0);
  });

  protected reload(): void {
    this.catalog.reload();
  }

  protected appLabel(applicationKey: string): string {
    return permissionScopeLabel(this.language, applicationKey);
  }

  /** `resource` is the middle segment of module.resource.action and is open-ended. */
  protected groupLabel(group: string): string {
    return this.language.labelOr(`permissions.groups.${group}`, humanizePermissionToken(group));
  }

  protected permissionName(item: PermissionCatalogItem): string {
    return permissionActionLabel(this.language, item.key, item);
  }
}
