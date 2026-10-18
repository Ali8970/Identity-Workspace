import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import {
  humanizePermissionToken,
  permissionActionLabel,
  permissionScopeLabel,
} from '../../../../core/i18n/permission-label';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Disclosure } from '../../../../shared/ui/disclosure/disclosure';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { MyAccessService } from '../../services/my-access.service';
import { MyAccessSkeleton } from './my-access.skeleton';

@Component({
  selector: 'app-my-access-page',
  imports: [
    TranslatePipe,
    MyAccessSkeleton,
    PageHeader,
    ListStats,
    Disclosure,
    EmptyState,
    ErrorPanel,
  ],
  template: `
    <div>
      <app-page-header
        [title]="'myAccess.title' | translate"
        [description]="'myAccess.subtitle' | translate"
      />

      <div class="mb-4">
        <app-list-stats [stats]="accessStats()" [loading]="loading()" />
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
          <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
        </svg>
        <span>{{ 'myAccess.accessHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <app-my-access-skeleton [label]="'myAccess.loading' | translate" />
      } @else if (loadFailed()) {
        <app-error-panel
          [title]="'common.loadFailed' | translate"
          [retryLabel]="'common.retry' | translate"
          (retry)="reload()"
        />
      } @else {
        <div class="grid items-start gap-4 max-w1024:grid-cols-1 grid-cols-2">
          <section
            class="overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
            aria-labelledby="my-access-roles-title"
          >
            <header class="border-b-[1.468px] border-border-subtle px-[18px] py-3">
              <h2 class="m-0 text-[14px] font-bold text-text" id="my-access-roles-title">
                {{ 'myAccess.rolesTitle' | translate }}
              </h2>
              <p class="m-0 mt-1 text-[12px] leading-normal text-text-muted">
                {{ 'myAccess.rolesLead' | translate }}
              </p>
            </header>
            @if (roles().length === 0) {
              <app-empty-state [title]="'myAccess.noRoles' | translate" />
            } @else {
              <ul class="m-0 flex list-none flex-col gap-2 p-3">
                @for (role of roles(); track role.id) {
                  <li
                    class="flex items-center gap-3 rounded-lg border-[1.468px] border-border-button bg-surface px-3 py-2.5"
                  >
                    <span
                      class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-light text-info"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        class="size-4"
                      >
                        <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                      </svg>
                    </span>
                    <span class="min-w-0">
                      <span class="block text-[13px] font-semibold text-text">
                        {{ language.pick(role.nameAr, role.nameEn) }}
                      </span>
                      <span class="mt-0.5 block text-[12px] font-normal text-text-muted">{{
                        role.code
                      }}</span>
                    </span>
                  </li>
                }
              </ul>
            }
          </section>

          <section
            class="overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
            aria-labelledby="my-access-permissions-title"
          >
            <header class="border-b-[1.468px] border-border-subtle px-[18px] py-3">
              <h2 class="m-0 text-[14px] font-bold text-text" id="my-access-permissions-title">
                {{ 'myAccess.permissionsTitle' | translate }}
              </h2>
              <p class="m-0 mt-1 text-[12px] leading-normal text-text-muted">
                {{ 'myAccess.permissionsLead' | translate }}
              </p>
            </header>
            @if (permissions().length === 0) {
              <app-empty-state [title]="'myAccess.noPermissions' | translate" />
            } @else {
              <div>
                @for (group of permissionGroups(); track group.applicationKey) {
                  <app-disclosure
                    [heading]="appLabel(group.applicationKey)"
                    [countLabel]="group.permissionCount + ''"
                  >
                    <div>
                      @for (resource of group.resources; track resource.resource) {
                        <section
                          class="border-t-[1.468px] border-border-button pt-3 mt-3 first:mt-0 first:border-t-0 first:pt-0"
                          [attr.aria-labelledby]="
                            'my-access-' + group.applicationKey + '-' + resource.resource
                          "
                        >
                          <h3
                            class="m-0 mb-1.5 text-[12px] font-semibold text-text-muted"
                            [id]="'my-access-' + group.applicationKey + '-' + resource.resource"
                          >
                            {{ resource.label }}
                          </h3>
                          <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                            @for (item of resource.items; track item.key) {
                              <li
                                class="inline-flex max-w-full rounded-md border-[1.468px] border-border-subtle bg-surface-muted px-2.5 py-1 text-[12.5px] font-medium leading-snug text-text"
                              >
                                {{ item.label }}
                              </li>
                            }
                          </ul>
                        </section>
                      }
                    </div>
                  </app-disclosure>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class MyAccessPage {
  private readonly myAccessService = inject(MyAccessService);
  private readonly session = inject(SessionStore);
  protected readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  private readonly access = rxResource({
    params: () => this.session.currentTenant()?.tenantMembershipId,
    stream: () => this.myAccessService.loadAccess(),
  });

  protected readonly loading = this.access.isLoading;
  protected readonly loadFailed = computed(() => this.access.status() === 'error');
  protected readonly roles = computed(() => this.access.value()?.roles ?? []);
  protected readonly permissions = computed(() =>
    [...new Set(this.roles().flatMap((role) => role.permissionKeys ?? []))].sort((left, right) =>
      left.localeCompare(right),
    ),
  );

  protected readonly accessStats = computed((): ListStatCard[] => {
    this.language.current();
    return [
      {
        label: this.translate.instant('myAccess.stats.roles'),
        value: this.roles().length,
        accent: '#2b5bf9',
        icon: 'values',
      },
      {
        label: this.translate.instant('myAccess.stats.permissions'),
        value: this.permissions().length,
        accent: '#1e00b0',
        icon: 'info',
      },
    ];
  });

  protected readonly permissionGroups = computed(() => {
    this.language.current();
    const locale = this.language.current();
    const byApp = new Map<string, Map<string, string[]>>();
    for (const key of this.permissions()) {
      const parts = key.split('.').filter(Boolean);
      const applicationKey = parts[0] || 'other';
      const resource = parts.length >= 3 ? parts[1] : applicationKey;
      const resources = byApp.get(applicationKey) ?? new Map<string, string[]>();
      const list = resources.get(resource) ?? [];
      list.push(key);
      resources.set(resource, list);
      byApp.set(applicationKey, resources);
    }

    return [...byApp.entries()]
      .map(([applicationKey, resources]) => {
        const resourceGroups = [...resources.entries()]
          .map(([resource, keys]) => ({
            resource,
            label: this.language.labelOr(
              `permissions.groups.${resource}`,
              humanizePermissionToken(resource),
            ),
            items: keys
              .map((key) => ({ key, label: permissionActionLabel(this.language, key) }))
              .sort((left, right) => left.label.localeCompare(right.label, locale)),
          }))
          .sort((left, right) => left.label.localeCompare(right.label, locale));
        return {
          applicationKey,
          resources: resourceGroups,
          permissionCount: resourceGroups.reduce((total, group) => total + group.items.length, 0),
        };
      })
      .sort((left, right) =>
        this.appLabel(left.applicationKey).localeCompare(this.appLabel(right.applicationKey), locale),
      );
  });

  protected reload(): void {
    this.access.reload();
  }

  protected appLabel(module: string): string {
    return permissionScopeLabel(this.language, module);
  }
}
