import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { LanguageService } from '../../../../core/i18n/language.service';
import { applicationModifier } from '../../../../shared/ui/display';
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
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
      } @else if (loadFailed()) {
        <section class="workspace-empty" role="status">
          <p class="workspace-empty__body">{{ 'common.loadFailed' | translate }}</p>
          <button type="button" class="ui-btn ui-btn--ghost" (click)="reload()">
            {{ 'common.retry' | translate }}
          </button>
        </section>
      } @else {
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
            <section
              class="workspace-app-group"
              [attr.aria-labelledby]="'roles-app-' + group.applicationKey"
            >
              <header class="workspace-app-group__head">
                <h2 class="workspace-app-group__title" [id]="'roles-app-' + group.applicationKey">
                  <span
                    class="workspace-app-group__icon"
                    [class]="
                      'workspace-app-group__icon--' + applicationModifier(group.applicationKey)
                    "
                    aria-hidden="true"
                  >
                    @switch (group.applicationKey) {
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
                  {{ appLabel(group.applicationKey) }}
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
                        {{ language.pick(role.nameAr, role.nameEn) }}
                      </h3>
                      <p class="workspace-role-card__code">{{ role.code }}</p>
                    </div>

                    <div class="workspace-role-card__meta">
                      <p class="workspace-role-card__perm-title">
                        {{ 'roles.permissions' | translate }}
                      </p>
                      <span class="workspace-chip workspace-chip--muted">
                        {{
                          'roles.permissionCount' | translate: { count: role.permissionKeys.length }
                        }}
                      </span>
                    </div>

                    <ul class="workspace-perm-list">
                      @if (role.permissionKeys.length === 0) {
                        <li class="workspace-perm-item workspace-perm-item--empty">
                          {{ 'roles.noPermissions' | translate }}
                        </li>
                      } @else {
                        @for (key of role.permissionKeys; track key) {
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
  private readonly session = inject(SessionStore);
  protected readonly language = inject(LanguageService);

  /** Exposed for the template — BEM modifier for the app tile. */
  protected readonly applicationModifier = applicationModifier;

  private readonly roleList = rxResource({
    // Keyed on the active company so a company switch re-fetches automatically.
    params: () => this.session.currentTenant()?.tenantMembershipId,
    stream: () => this.rolesService.listForCurrentTenant(),
    defaultValue: [] as RoleListItem[],
  });

  protected readonly roles = this.roleList.value;
  protected readonly loading = this.roleList.isLoading;
  /** The error interceptor already raised the banner; this only offers the retry. */
  protected readonly loadFailed = computed(() => this.roleList.status() === 'error');

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

  protected reload(): void {
    this.roleList.reload();
  }

  /** Falls back to the raw applicationKey when the catalogue has no label for it. */
  protected appLabel(applicationKey: string): string {
    return this.language.labelOr(`roles.apps.${applicationKey}`, applicationKey);
  }
}
