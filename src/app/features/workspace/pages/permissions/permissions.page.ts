import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { applicationModifier } from '../../../../shared/ui/display';
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
  imports: [TranslatePipe, PermissionsSkeleton, PageHeader, ListStats, EmptyState, ErrorPanel],
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
        <div class="flex flex-col gap-4">
          @for (appGroup of applicationGroups(); track appGroup.applicationKey) {
            <section
              class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
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

              <div class="flex flex-col gap-0 divide-y-[1.468px] divide-border-subtle">
                @for (group of appGroup.groups; track group.name) {
                  <section
                    class="px-[18px] py-3.5"
                    [attr.aria-labelledby]="
                      'permissions-group-' + appGroup.applicationKey + '-' + group.name
                    "
                  >
                    <header class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <h3
                        class="m-0 text-[13px] font-semibold text-text"
                        [id]="'permissions-group-' + appGroup.applicationKey + '-' + group.name"
                      >
                        {{ groupLabel(group.name) }}
                      </h3>
                      <span
                        class="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted"
                      >
                        {{ 'permissions.groupCount' | translate: { count: group.items.length } }}
                      </span>
                    </header>

                    <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
                      @for (item of group.items; track item.key) {
                        <li
                          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[1.468px] border-border-subtle bg-surface-muted/40 px-3 py-2.5"
                        >
                          <span class="min-w-0 flex flex-col gap-0.5">
                            <strong class="text-[13px] font-semibold text-text">
                              {{ language.pick(item.nameAr, item.nameEn) }}
                            </strong>
                            <span class="text-[11px] font-medium text-text-muted">
                              {{ 'permissions.keyLabel' | translate }}
                            </span>
                          </span>
                          <code
                            class="ltr-text rounded-md border-[1.468px] border-border-button bg-surface px-2 py-1 font-mono text-[11px] font-semibold text-text-muted"
                            dir="ltr"
                          >{{ item.key }}</code>
                        </li>
                      }
                    </ul>
                  </section>
                }
              </div>
            </section>
          }
        </div>
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

  protected reload(): void {
    this.catalog.reload();
  }

  /** Falls back to the raw applicationKey when the catalogue has no label for it. */
  protected appLabel(applicationKey: string): string {
    return this.language.labelOr(`permissions.apps.${applicationKey}`, applicationKey);
  }

  /** `resource` is the middle segment of module.resource.action and is open-ended. */
  protected groupLabel(group: string): string {
    return this.language.labelOr(`permissions.groups.${group}`, group);
  }
}
