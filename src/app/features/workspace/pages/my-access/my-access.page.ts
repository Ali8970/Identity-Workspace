import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { PanelSection } from '../../../../shared/ui/panel-section/panel-section';
import { MyAccessService } from '../../services/my-access.service';
import { MyAccessSkeleton } from './my-access.skeleton';

@Component({
  selector: 'app-my-access-page',
  imports: [
    TranslatePipe,
    MyAccessSkeleton,
    PageHeader,
    ListStats,
    PanelSection,
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
        <div class="grid gap-4 max-w1024:grid-cols-1 grid-cols-2">
          <app-panel-section
            [title]="'myAccess.rolesTitle' | translate"
            [description]="'myAccess.rolesLead' | translate"
          >
            @if (roles().length === 0) {
              <app-empty-state [title]="'myAccess.noRoles' | translate" />
            } @else {
              <ul class="m-0 flex list-none flex-col gap-2 p-0">
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
          </app-panel-section>

          <app-panel-section
            [title]="'myAccess.permissionsTitle' | translate"
            [description]="'myAccess.permissionsLead' | translate"
          >
            @if (permissions().length === 0) {
              <app-empty-state [title]="'myAccess.noPermissions' | translate" />
            } @else {
              <div class="flex flex-col gap-4">
                @for (group of permissionGroups(); track group.applicationKey) {
                  <section [attr.aria-labelledby]="'my-access-app-' + group.applicationKey">
                    <header class="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3
                        class="m-0 text-[13px] font-semibold text-text"
                        [id]="'my-access-app-' + group.applicationKey"
                      >
                        {{ appLabel(group.applicationKey) }}
                      </h3>
                      <span
                        class="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted"
                      >
                        {{ 'myAccess.groupCount' | translate: { count: group.items.length } }}
                      </span>
                    </header>
                    <ul class="m-0 flex list-none flex-col gap-1 p-0">
                      @for (perm of group.items; track perm) {
                        <li
                          class="rounded-md border-[1.468px] border-border-subtle bg-surface-muted px-2.5 py-1.5 text-[12px] font-medium text-text"
                        >
                          {{ perm }}
                        </li>
                      }
                    </ul>
                  </section>
                }
              </div>
            }
          </app-panel-section>
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
    const groups = new Map<string, string[]>();
    for (const permission of this.permissions()) {
      const applicationKey = permission.includes('.') ? permission.split('.')[0] : 'other';
      const list = groups.get(applicationKey) ?? [];
      list.push(permission);
      groups.set(applicationKey, list);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([applicationKey, items]) => ({
        applicationKey,
        items: items.sort((left, right) => left.localeCompare(right)),
      }));
  });

  protected reload(): void {
    this.access.reload();
  }

  protected appLabel(module: string): string {
    return this.language.labelOr(`myAccess.apps.${module}`, module);
  }
}
