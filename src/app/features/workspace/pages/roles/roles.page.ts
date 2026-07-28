import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { BroochError } from '../../../../core/error/brooch-error.model';
import { RoleListItem } from '../../models/workspace-feature.model';
import { RolesService } from '../../services/roles.service';

@Component({
  selector: 'app-roles-page',
  imports: [TranslatePipe],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'roles.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'roles.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'roles.subtitle' | translate }}</p>
        </div>

        <div class="workspace-page__meta">
          <span class="workspace-chip workspace-chip--muted">
            {{ 'roles.roleCount' | translate: { count: roles().length } }}
          </span>
        </div>
      </header>

      <aside class="workspace-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span>{{ 'roles.readOnlyHint' | translate }}</span>
      </aside>

      @if (loading()) {
        <div class="workspace-loading" role="status" aria-live="polite">
          <span class="workspace-loading__spinner" aria-hidden="true"></span>
          <span>{{ 'roles.loading' | translate }}</span>
        </div>
      } @else {
        @if (error(); as failure) {
          <div class="workspace-status workspace-status--error" role="alert">
            <span class="workspace-status__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </span>
            <span class="workspace-status__body">{{ failure.message }}</span>
          </div>
        }

        @if (roles().length === 0) {
          <section class="workspace-empty" role="status">
            <div class="workspace-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
                <circle cx="12" cy="10" r="2.5" />
                <path d="M8 16h8" />
              </svg>
            </div>
            <h2 class="workspace-empty__title">{{ 'roles.emptyTitle' | translate }}</h2>
            <p class="workspace-empty__body">{{ 'roles.emptyBody' | translate }}</p>
          </section>
        } @else {
          @for (group of groupedRoles(); track group.applicationKey) {
            <section class="workspace-app-group" [attr.aria-labelledby]="'roles-app-' + group.applicationKey">
              <header class="workspace-app-group__head">
                <h2 class="workspace-app-group__title" [id]="'roles-app-' + group.applicationKey">
                  <span
                    class="workspace-app-group__icon"
                    [class]="'workspace-app-group__icon--' + appModifier(group.applicationKey)"
                    aria-hidden="true"
                  >
                    @switch (group.applicationKey) {
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
                  {{ appLabelKey(group.applicationKey) | translate }}
                </h2>
                <span class="workspace-chip workspace-chip--muted">
                  {{ 'roles.groupCount' | translate: { count: group.roles.length } }}
                </span>
              </header>

              <div class="workspace-role-grid" role="list">
                @for (role of group.roles; track role.id) {
                  <article class="workspace-role-card" role="listitem">
                    <div class="workspace-role-card__head">
                      <h3 class="workspace-role-card__name">
                        {{ label(role.nameAr, role.nameEn) }}
                      </h3>
                      <p class="workspace-role-card__code">{{ role.code }}</p>
                    </div>

                    <div class="workspace-role-card__meta">
                      <p class="workspace-role-card__perm-title">
                        {{ 'roles.permissions' | translate }}
                      </p>
                      <span class="workspace-chip workspace-chip--muted">
                        {{
                          'roles.permissionCount'
                            | translate: { count: role.permissionKeys?.length ?? 0 }
                        }}
                      </span>
                    </div>

                    <ul class="workspace-perm-list">
                      @if ((role.permissionKeys?.length ?? 0) === 0) {
                        <li class="workspace-perm-item workspace-perm-item--empty">
                          {{ 'roles.noPermissions' | translate }}
                        </li>
                      } @else {
                        @for (key of role.permissionKeys ?? []; track key) {
                          <li class="workspace-perm-item">{{ key }}</li>
                        }
                      }
                    </ul>
                  </article>
                }
              </div>
            </section>
          }
        }
      }
    </div>
  `,
})
export class RolesPage {
  private readonly rolesService = inject(RolesService);
  private readonly language = inject(LanguageService);

  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<BroochError | null>(null);

  protected readonly groupedRoles = computed(() => {
    const groups = new Map<string, RoleListItem[]>();
    for (const role of this.roles()) {
      const list = groups.get(role.applicationKey) ?? [];
      list.push(role);
      groups.set(role.applicationKey, list);
    }
    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([applicationKey, roles]) => ({ applicationKey, roles }));
  });

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected appLabelKey(applicationKey: string): string {
    return `roles.apps.${applicationKey}`;
  }

  protected appModifier(applicationKey: string): string {
    if (applicationKey === 'identity' || applicationKey === 'crm' || applicationKey === 'hr') {
      return applicationKey;
    }
    return 'default';
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.roles.set(await firstValueFrom(this.rolesService.listForCurrentTenant()));
    } catch (err) {
      this.error.set(err as BroochError);
    } finally {
      this.loading.set(false);
    }
  }
}
