import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { PermissionCatalogItem } from '../../models/workspace-feature.model';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-permissions-page',
  imports: [TranslatePipe],
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7h.01" />
        </svg>
        <span>{{ 'permissions.catalogHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <div class="workspace-loading" role="status" aria-live="polite">
          <span class="workspace-loading__spinner" aria-hidden="true"></span>
          <span>{{ 'permissions.loading' | translate }}</span>
        </div>
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
                <h2 class="workspace-app-group__title" [id]="'permissions-app-' + appGroup.applicationKey">
                  <span
                    class="workspace-app-group__icon"
                    [class]="'workspace-app-group__icon--' + appModifier(appGroup.applicationKey)"
                    aria-hidden="true"
                  >
                    @switch (appGroup.applicationKey) {
                      @case ('identity') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                        </svg>
                      }
                      @case ('crm') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="3.5" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      }
                      @case ('hr') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <rect x="3" y="7" width="18" height="13" rx="2" />
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      }
                      @default {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        </svg>
                      }
                    }
                  </span>
                  {{ appLabelKey(appGroup.applicationKey) | translate }}
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
                  [attr.aria-labelledby]="'permissions-group-' + appGroup.applicationKey + '-' + group.name"
                >
                  <header class="workspace-perm-group__head">
                    <h3
                      class="workspace-perm-group__title"
                      [id]="'permissions-group-' + appGroup.applicationKey + '-' + group.name"
                    >
                      {{ groupLabelKey(group.name) | translate }}
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
                            {{ label(item.nameAr, item.nameEn) }}
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
  private readonly language = inject(LanguageService);

  protected readonly items = signal<PermissionCatalogItem[]>([]);
  protected readonly loading = signal(true);

  protected readonly applicationGroups = computed(() => {
    const byApp = new Map<string, Map<string, PermissionCatalogItem[]>>();

    for (const item of this.items()) {
      const groups = byApp.get(item.applicationKey) ?? new Map<string, PermissionCatalogItem[]>();
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
      byApp.set(item.applicationKey, groups);
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

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected appLabelKey(applicationKey: string): string {
    return `permissions.apps.${applicationKey}`;
  }

  protected groupLabelKey(group: string): string {
    return `permissions.groups.${group}`;
  }

  protected appModifier(applicationKey: string): string {
    if (applicationKey === 'identity' || applicationKey === 'crm' || applicationKey === 'hr') {
      return applicationKey;
    }
    return 'default';
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set(await firstValueFrom(this.permissionsService.loadCatalog()));
    } finally {
      this.loading.set(false);
    }
  }
}
