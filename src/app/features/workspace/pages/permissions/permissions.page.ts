import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { applicationModifier } from '../../../../shared/ui/display';
import { PermissionCatalogItem } from '../../models/workspace-feature.model';
import { PermissionsService } from '../../services/permissions.service';
import { PermissionsSkeleton } from './permissions.skeleton';

@Component({
  selector: 'app-permissions-page',
  imports: [TranslatePipe, PermissionsSkeleton],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'permissions.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'permissions.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'permissions.subtitle' | translate }}</p>
        </div>

        <div class="workspace-page__meta">
          <span class="workspace-chip workspace-chip--muted">
            {{ 'permissions.permissionCount' | translate: { count: items().length } }}
          </span>
        </div>
      </header>

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
        <span>{{ 'permissions.catalogHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <app-permissions-skeleton [label]="'permissions.loading' | translate" />
      } @else if (loadFailed()) {
        <section class="workspace-empty" role="status">
          <p class="workspace-empty__body">{{ 'common.loadFailed' | translate }}</p>
          <button type="button" class="ui-btn ui-btn--ghost" (click)="reload()">
            {{ 'common.retry' | translate }}
          </button>
        </section>
      } @else {
        @if (items().length === 0) {
          <section class="workspace-empty" role="status">
            <div class="workspace-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                <path d="M9 12h6M12 9v6" />
              </svg>
            </div>
            <h2 class="workspace-empty__title">{{ 'permissions.emptyTitle' | translate }}</h2>
            <p class="workspace-empty__body">{{ 'permissions.emptyBody' | translate }}</p>
          </section>
        } @else {
          @for (appGroup of applicationGroups(); track appGroup.applicationKey) {
            <section
              class="workspace-app-group"
              [attr.aria-labelledby]="'permissions-app-' + appGroup.applicationKey"
            >
              <header class="workspace-app-group__head">
                <h2
                  class="workspace-app-group__title"
                  [id]="'permissions-app-' + appGroup.applicationKey"
                >
                  <span
                    class="workspace-app-group__icon"
                    [class]="
                      'workspace-app-group__icon--' + applicationModifier(appGroup.applicationKey)
                    "
                    aria-hidden="true"
                  >
                    @switch (appGroup.applicationKey) {
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
                  {{ appLabel(appGroup.applicationKey) }}
                </h2>
                <span class="workspace-chip workspace-chip--muted">
                  {{
                    'permissions.groupPermissionCount'
                      | translate: { count: appGroup.permissionCount }
                  }}
                </span>
              </header>

              @for (group of appGroup.groups; track group.name) {
                <section
                  class="workspace-perm-group"
                  [attr.aria-labelledby]="
                    'permissions-group-' + appGroup.applicationKey + '-' + group.name
                  "
                >
                  <header class="workspace-perm-group__head">
                    <h3
                      class="workspace-perm-group__title"
                      [id]="'permissions-group-' + appGroup.applicationKey + '-' + group.name"
                    >
                      {{ groupLabel(group.name) }}
                    </h3>
                    <span class="workspace-chip workspace-chip--muted">
                      {{ 'permissions.groupCount' | translate: { count: group.items.length } }}
                    </span>
                  </header>

                  <ul class="workspace-perm-catalog">
                    @for (item of group.items; track item.key) {
                      <li class="workspace-perm-catalog-item">
                        <span class="workspace-perm-catalog-item__body">
                          <strong class="workspace-perm-catalog-item__name">
                            {{ language.pick(item.nameAr, item.nameEn) }}
                          </strong>
                          <span class="workspace-perm-catalog-item__desc">
                            {{ 'permissions.keyLabel' | translate }}
                          </span>
                        </span>
                        <code class="workspace-perm-catalog-item__key">{{ item.key }}</code>
                      </li>
                    }
                  </ul>
                </section>
              }
            </section>
          }
        }
      }
    </div>
  `,
})
export class PermissionsPage {
  private readonly permissionsService = inject(PermissionsService);
  protected readonly language = inject(LanguageService);

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
