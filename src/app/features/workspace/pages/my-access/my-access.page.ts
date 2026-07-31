import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MyAccessService } from '../../services/my-access.service';

@Component({
  selector: 'app-my-access-page',
  imports: [TranslatePipe],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'myAccess.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'myAccess.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'myAccess.subtitle' | translate }}</p>
        </div>

        <div class="workspace-page__meta">
          @if (tenantName()) {
            <span class="workspace-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M4 21V8l8-4 8 4v13" />
                <path d="M9 21V12h6v9" />
              </svg>
              {{ tenantName() }}
            </span>
          }
          <span class="workspace-chip workspace-chip--muted">
            {{ 'myAccess.roleCount' | translate: { count: roles().length } }}
          </span>
          <span class="workspace-chip workspace-chip--muted">
            {{ 'myAccess.permissionCount' | translate: { count: permissions().length } }}
          </span>
        </div>
      </header>

      <aside class="workspace-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
        </svg>
        <span>{{ 'myAccess.accessHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <div class="workspace-loading" role="status" aria-live="polite">
          <span class="workspace-loading__spinner" aria-hidden="true"></span>
          <span>{{ 'myAccess.loading' | translate }}</span>
        </div>
      } @else {
        <div class="workspace-access-grid">
          <section class="workspace-panel" aria-labelledby="my-access-roles-heading">
            <header class="workspace-panel__head">
              <h2 class="workspace-panel__title" id="my-access-roles-heading">
                {{ 'myAccess.rolesTitle' | translate }}
              </h2>
              <p class="workspace-panel__lead">{{ 'myAccess.rolesLead' | translate }}</p>
            </header>

            <div class="workspace-panel__body">
              @if (roles().length === 0) {
                <p class="workspace-panel__empty" role="status">{{ 'myAccess.noRoles' | translate }}</p>
              } @else {
                <div class="workspace-access-role-list" role="list">
                  @for (role of roles(); track role.id) {
                    <article class="workspace-access-role" role="listitem">
                      <span class="workspace-access-role__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                        </svg>
                      </span>
                      <span class="workspace-access-role__body">
                        <strong class="workspace-access-role__name">
                          {{ label(role.nameAr, role.nameEn) }}
                        </strong>
                        <span class="workspace-access-role__code">{{ role.code }}</span>
                      </span>
                    </article>
                  }
                </div>
              }
            </div>
          </section>

          <section class="workspace-panel" aria-labelledby="my-access-permissions-heading">
            <header class="workspace-panel__head">
              <h2 class="workspace-panel__title" id="my-access-permissions-heading">
                {{ 'myAccess.permissionsTitle' | translate }}
              </h2>
              <p class="workspace-panel__lead">{{ 'myAccess.permissionsLead' | translate }}</p>
            </header>

            <div class="workspace-panel__body">
              @if (permissions().length === 0) {
                <p class="workspace-panel__empty" role="status">
                  {{ 'myAccess.noPermissions' | translate }}
                </p>
              } @else {
                @for (group of permissionGroups(); track group.applicationKey) {
                  <section
                    class="workspace-access-perm-group"
                    [attr.aria-labelledby]="'my-access-app-' + group.applicationKey"
                  >
                    <header class="workspace-access-perm-group__head">
                      <h3
                        class="workspace-access-perm-group__title"
                        [id]="'my-access-app-' + group.applicationKey"
                      >
                        {{ appLabelKey(group.applicationKey) | translate }}
                      </h3>
                      <span class="workspace-chip workspace-chip--muted">
                        {{ 'myAccess.groupCount' | translate: { count: group.items.length } }}
                      </span>
                    </header>
                    <ul class="workspace-perm-list">
                      @for (perm of group.items; track perm) {
                        <li class="workspace-perm-item">{{ perm }}</li>
                      }
                    </ul>
                  </section>
                }
              }
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class MyAccessPage {
  private readonly myAccessService = inject(MyAccessService);
  private readonly session = inject(SessionStore);
  private readonly language = inject(LanguageService);

  protected readonly roles = signal<{ id: string; code: string; nameAr: string; nameEn: string }[]>(
    [],
  );
  protected readonly permissions = signal<string[]>([]);
  protected readonly loading = signal(true);

  protected readonly tenantName = computed(() => {
    const tenant = this.session.currentTenant();
    if (!tenant) {
      return '';
    }
    return this.language.current() === 'ar'
      ? tenant.nameAr || tenant.nameEn
      : tenant.nameEn || tenant.nameAr;
  });

  protected readonly permissionGroups = computed(() => {
    const groups = new Map<string, string[]>();
    for (const permission of this.permissions()) {
      const applicationKey = permission.includes('.')
        ? permission.split('.')[0]
        : 'other';
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

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected appLabelKey(applicationKey: string): string {
    return `myAccess.apps.${applicationKey}`;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const access = await firstValueFrom(this.myAccessService.loadAccess());
      const roles = access.roles ?? [];
      this.roles.set(roles);
      // /me/access carries permissions per role, not as a flat list — the union
      // across roles is what summary.permissionsCount counts.
      this.permissions.set(
        [...new Set(roles.flatMap((role) => role.permissionKeys ?? []))].sort((left, right) =>
          left.localeCompare(right),
        ),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
