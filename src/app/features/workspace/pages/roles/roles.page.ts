import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { applicationModifier } from '../../../../shared/ui/display';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import {
  MemberListItem,
  PermissionCatalogItem,
  RoleListItem,
} from '../../models/workspace-feature.model';
import { RoleGrantScope, RolesService } from '../../services/roles.service';
import { RoleDetailsDialog } from './role-details-dialog';
import {
  RoleApplicationOption,
  RoleFormDialog,
  RoleFormMode,
  RoleFormResult,
} from './role-form-dialog';
import { RolesSkeleton } from './roles.skeleton';

type StatusFilter = '' | 'active' | 'inactive';

interface RoleNotice {
  key: string;
  name: string;
}

@Component({
  selector: 'app-roles-page',
  imports: [
    TranslatePipe,
    ConfirmDialog,
    RoleDetailsDialog,
    RoleFormDialog,
    RolesSkeleton,
    Skeleton,
  ],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head workspace-roles-head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'roles.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'roles.title' | translate }}
          </h1>
          <p class="workspace-page__lead">
            {{ (canManage() ? 'roles.subtitle' : 'roles.subtitleReadOnly') | translate }}
          </p>

          <ul class="workspace-roles-head__summary" [attr.aria-label]="'roles.summary' | translate">
            @if (initialLoading()) {
              <li><app-skeleton variant="chip" /></li>
              <li><app-skeleton variant="chip" /></li>
            } @else if (!loadFailed()) {
              <li class="workspace-chip workspace-chip--muted">
                {{ 'roles.roleCount' | translate: { count: roles().length } }}
              </li>
              <li class="workspace-chip workspace-chip--muted">
                {{ 'roles.applicationCount' | translate: { count: applications().length } }}
              </li>
              @if (inactiveCount() > 0) {
                <li class="workspace-chip workspace-chip--muted">
                  {{ 'roles.inactiveCount' | translate: { count: inactiveCount() } }}
                </li>
              }
            }
          </ul>
        </div>

        @if (canManage()) {
          <div class="workspace-page__meta">
            <button
              type="button"
              class="ui-btn ui-btn--primary"
              id="roles-add-button"
              aria-haspopup="dialog"
              [disabled]="initialLoading() || loadFailed() || applications().length === 0"
              (click)="openCreate()"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
                class="ui-btn__icon"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {{ 'roles.add' | translate }}
            </button>
          </div>
        }
      </header>

      @if (notice(); as current) {
        <div class="workspace-status workspace-status--success" role="status">
          <span class="workspace-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <span class="workspace-status__body">
            {{ current.key | translate: { name: current.name } }}
          </span>
          <button
            type="button"
            class="workspace-roles-notice__dismiss"
            [attr.aria-label]="'roles.notice.dismiss' | translate"
            (click)="notice.set(null)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      }

      @if (initialLoading()) {
        <app-roles-skeleton [label]="'roles.loading' | translate" />
      } @else if (loadFailed()) {
        <section class="workspace-empty" role="status">
          <p class="workspace-empty__body">{{ 'common.loadFailed' | translate }}</p>
          <button type="button" class="ui-btn ui-btn--ghost" (click)="reload()">
            {{ 'common.retry' | translate }}
          </button>
        </section>
      } @else if (roles().length === 0) {
        <section class="workspace-empty" role="status">
          <div class="workspace-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 3 4 7v6c0 5 3.5 7.7 8 8 4.5-.3 8-3 8-8V7l-8-4Z" />
              <circle cx="12" cy="10" r="2.5" />
              <path d="M8.5 16c.7-1.3 1.9-2 3.5-2s2.8.7 3.5 2" />
            </svg>
          </div>
          @if (canManage()) {
            <h2 class="workspace-empty__title">{{ 'roles.emptyTitle' | translate }}</h2>
            <p class="workspace-empty__body">{{ 'roles.emptyBodyManage' | translate }}</p>
            @if (applications().length > 0) {
              <button
                type="button"
                class="ui-btn ui-btn--primary"
                aria-haspopup="dialog"
                (click)="openCreate()"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                  class="ui-btn__icon"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {{ 'roles.add' | translate }}
              </button>
            }
          } @else {
            <h2 class="workspace-empty__title">{{ 'roles.emptyReadOnly' | translate }}</h2>
          }
        </section>
      } @else {
        <section class="workspace-data-card" aria-labelledby="roles-list-heading">
          <header class="workspace-data-card__head">
            <h2 class="workspace-data-card__title" id="roles-list-heading">
              {{ 'roles.listTitle' | translate }}
            </h2>
            <span class="workspace-data-card__count" aria-live="polite">
              {{
                'roles.showing' | translate: { shown: visibleRoles().length, total: roles().length }
              }}
            </span>
          </header>

          <div class="workspace-listbar">
            <div class="workspace-listbar__search">
              <span class="workspace-listbar__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <input
                type="search"
                class="workspace-listbar__input"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
                [placeholder]="'roles.search' | translate"
                [attr.aria-label]="'roles.search' | translate"
              />
            </div>

            @if (applications().length > 1) {
              <select
                class="workspace-facet"
                [value]="applicationFilter()"
                (change)="applicationFilter.set($any($event.target).value)"
                [attr.aria-label]="'roles.filterApplication' | translate"
              >
                <option value="">{{ 'roles.filterAllApplications' | translate }}</option>
                @for (application of applications(); track application.key) {
                  <option [value]="application.key">{{ application.label }}</option>
                }
              </select>
            }

            @if (inactiveCount() > 0 || statusFilter() !== '') {
              <select
                class="workspace-facet"
                [value]="statusFilter()"
                (change)="statusFilter.set($any($event.target).value)"
                [attr.aria-label]="'roles.filterStatus' | translate"
              >
                <option value="">{{ 'roles.filterAllStatuses' | translate }}</option>
                <option value="active">{{ 'roles.active' | translate }}</option>
                <option value="inactive">{{ 'roles.inactive' | translate }}</option>
              </select>
            }
          </div>

          @if (visibleRoles().length === 0) {
            <div class="workspace-empty workspace-empty--flush" role="status">
              <span class="workspace-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <p class="workspace-empty__title">{{ 'roles.noResults' | translate }}</p>
              <button type="button" class="ui-btn ui-btn--ghost" (click)="clearFilters()">
                {{ 'roles.clearFilters' | translate }}
              </button>
            </div>
          } @else {
            <ul class="workspace-role-grid">
              @for (role of visibleRoles(); track role.id) {
                @let name = roleName(role);
                @let editable = canEditRole(role);
                <li
                  class="workspace-role-card"
                  [class.workspace-role-card--inactive]="!role.isActive"
                  [class.workspace-role-card--owner]="role.isOwnerRole"
                >
                  <div class="workspace-role-card__top">
                    <span class="workspace-role-card__app">
                      <span
                        [class]="
                          'workspace-app-group__icon workspace-role-card__app-icon workspace-app-group__icon--' +
                          applicationModifier(role.applicationKey)
                        "
                        aria-hidden="true"
                      >
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
                      </span>
                      <bdi>{{ appLabel(role.applicationKey) }}</bdi>
                    </span>
                    <span
                      class="workspace-status-pill"
                      [class.workspace-status-pill--active]="role.isActive"
                      [class.workspace-role-status--inactive]="!role.isActive"
                    >
                      {{ (role.isActive ? 'roles.active' : 'roles.inactive') | translate }}
                    </span>
                  </div>

                  <h3 class="workspace-role-card__name">{{ name }}</h3>

                  <div class="workspace-role-card__badges">
                    @if (role.isOwnerRole) {
                      <span class="workspace-role-badge workspace-role-badge--owner">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                          aria-hidden="true"
                        >
                          <path d="m4 8 4 3 4-6 4 6 4-3-2 10H6L4 8Z" />
                        </svg>
                        {{ 'roles.ownerRole' | translate }}
                      </span>
                    } @else if (role.isSystem) {
                      <span class="workspace-role-badge workspace-role-badge--system">
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
                        {{ 'roles.systemRole' | translate }}
                      </span>
                    } @else {
                      <span class="workspace-role-badge">
                        {{ 'roles.customRole' | translate }}
                      </span>
                    }
                  </div>

                  <p
                    class="workspace-role-card__desc"
                    [class.workspace-role-card__desc--empty]="!role.description"
                  >
                    {{ role.description || ('roles.noDescription' | translate) }}
                  </p>

                  <div class="workspace-role-card__foot">
                    <span class="workspace-role-card__stat">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="15" r="4" />
                        <path d="m10.8 12.2 8.2-8.2M16 7l2 2M14 9l2 2" />
                      </svg>
                      {{ 'roles.permissionCount' | translate: { count: role.permissionKeys.length } }}
                    </span>

                    <button
                      type="button"
                      class="workspace-role-card__action"
                      aria-haspopup="dialog"
                      [id]="'role-card-' + role.id"
                      [attr.aria-label]="
                        (editable ? 'roles.manageRoleFor' : 'roles.viewRoleFor')
                          | translate: { name: name }
                      "
                      (click)="openDetails(role)"
                    >
                      {{ (editable ? 'roles.manageRole' : 'roles.viewRole') | translate }}
                      <svg
                        class="workspace-role-card__arrow"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>

    @if (selectedRole(); as role) {
      <app-role-details-dialog
        [role]="role"
        [applicationLabel]="appLabel(role.applicationKey)"
        [applicationModifier]="applicationModifier(role.applicationKey)"
        [catalog]="permissionCatalog()"
        [canManage]="canManage()"
        [canReadMembers]="canReadMembers()"
        [members]="roleMembers()"
        [membersLoading]="membersLoading()"
        [busy]="saving()"
        (closed)="closeDetails()"
        (edit)="openEdit(role)"
        (activate)="setActive(role, true)"
        (deactivate)="deactivateTarget.set(role)"
      />
    }

    @if (formMode(); as mode) {
      <app-role-form-dialog
        [mode]="mode"
        [role]="formRole()"
        [applications]="applications()"
        [initialApplication]="defaultApplication()"
        [catalog]="permissionCatalog()"
        [catalogAvailable]="canReadPermissions()"
        [grantScope]="grantScope()"
        [availableKeys]="formAvailableKeys()"
        [loading]="formLoading()"
        [saving]="saving()"
        (closed)="closeForm()"
        (submitted)="saveForm($event)"
      />
    }

    @if (deactivateTarget(); as role) {
      <app-confirm-dialog
        title="roles.deactivateTitle"
        body="roles.deactivateBody"
        [bodyParams]="{ name: roleName(role) }"
        confirmLabel="roles.details.deactivate"
        cancelLabel="common.cancel"
        busyLabel="roles.deactivating"
        [destructive]="true"
        [busy]="saving()"
        (confirmed)="setActive(role, false)"
        (cancelled)="cancelDeactivate()"
      />
    }
  `,
})
export class RolesPage {
  private readonly rolesService = inject(RolesService);
  private readonly session = inject(SessionStore);
  private readonly applicationLabels = inject(ApplicationLabels);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);

  protected readonly applicationModifier = applicationModifier;

  private readonly catalog = rxResource({
    params: () => this.session.currentTenant()?.tenantMembershipId,
    stream: () => this.rolesService.loadRolesAndPermissionCatalog(),
    defaultValue: { roles: [], permissions: [] } as {
      roles: RoleListItem[];
      permissions: PermissionCatalogItem[];
    },
  });

  protected readonly roles = computed(() => this.catalog.value().roles);
  protected readonly permissionCatalog = computed(() => this.catalog.value().permissions);
  protected readonly initialLoading = computed(() => this.catalog.status() === 'loading');
  protected readonly loadFailed = computed(() => this.catalog.status() === 'error');

  protected readonly canManage = computed(() => this.rolesService.canManageRoles());
  protected readonly canReadMembers = computed(() => this.rolesService.canReadMembers());
  protected readonly canReadPermissions = computed(() => this.rolesService.canReadPermissions());

  protected readonly search = signal('');
  protected readonly applicationFilter = signal('');
  protected readonly statusFilter = signal<StatusFilter>('');

  protected readonly notice = signal<RoleNotice | null>(null);
  protected readonly saving = signal(false);

  private readonly selectedId = signal<string | null>(null);
  protected readonly roleMembers = signal<MemberListItem[]>([]);
  protected readonly membersLoading = signal(false);

  protected readonly formMode = signal<RoleFormMode | null>(null);
  protected readonly formRole = signal<RoleListItem | null>(null);
  protected readonly formAvailableKeys = signal<string[] | null>(null);
  protected readonly formLoading = signal(false);
  protected readonly grantScope = signal<RoleGrantScope | null>(null);

  protected readonly deactivateTarget = signal<RoleListItem | null>(null);

  protected readonly selectedRole = computed(() => {
    const id = this.selectedId();
    return id ? (this.roles().find((role) => role.id === id) ?? null) : null;
  });

  protected readonly applications = computed<RoleApplicationOption[]>(() => {
    const fromRoles = this.roles().map((role) => role.applicationKey);
    const keys =
      fromRoles.length > 0
        ? fromRoles
        : (this.session.current()?.availableApplications ?? []).map((app) => app.key);
    return [...new Set(keys)]
      .map((key) => ({ key, label: this.appLabel(key) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  protected readonly inactiveCount = computed(
    () => this.roles().filter((role) => !role.isActive).length,
  );

  protected readonly defaultApplication = computed(() => {
    const filter = this.applicationFilter();
    if (filter) {
      return filter;
    }
    const options = this.applications();
    return options.length === 1 ? options[0].key : '';
  });

  protected readonly visibleRoles = computed(() => {
    const term = this.search().trim().toLowerCase();
    const application = this.applicationFilter();
    const status = this.statusFilter();

    return this.roles()
      .filter((role) => {
        if (application && role.applicationKey !== application) {
          return false;
        }
        if (status === 'active' && !role.isActive) {
          return false;
        }
        if (status === 'inactive' && role.isActive) {
          return false;
        }
        if (!term) {
          return true;
        }
        return [role.code, role.nameAr, role.nameEn, role.description, this.appLabel(role.applicationKey)]
          .some((value) => (value ?? '').toLowerCase().includes(term));
      })
      .sort(
        (a, b) =>
          this.appLabel(a.applicationKey).localeCompare(this.appLabel(b.applicationKey)) ||
          Number(b.isOwnerRole) - Number(a.isOwnerRole) ||
          Number(b.isSystem) - Number(a.isSystem) ||
          Number(b.isActive) - Number(a.isActive) ||
          this.roleName(a).localeCompare(this.roleName(b)),
      );
  });

  protected reload(): void {
    this.catalog.reload();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.applicationFilter.set('');
    this.statusFilter.set('');
  }

  protected appLabel(applicationKey: string): string {
    return (
      this.applicationLabels.label(applicationKey) ||
      this.language.labelOr(`roles.apps.${applicationKey}`, applicationKey)
    );
  }

  protected roleName(role: RoleListItem): string {
    return this.language.pick(role.nameAr, role.nameEn) || role.code;
  }

  protected canEditRole(role: RoleListItem): boolean {
    return this.canManage() && !this.rolesService.isProtected(role);
  }

  protected openDetails(role: RoleListItem): void {
    this.selectedId.set(role.id);
    void this.loadRoleMembers(role.id);
  }

  protected closeDetails(): void {
    const id = this.selectedId();
    this.selectedId.set(null);
    this.roleMembers.set([]);
    if (id) {
      afterNextRender(() => document.getElementById(`role-card-${id}`)?.focus(), {
        injector: this.injector,
      });
    }
  }

  protected async openCreate(): Promise<void> {
    if (!this.canManage()) {
      return;
    }
    this.notice.set(null);
    this.formRole.set(null);
    this.formAvailableKeys.set(null);
    this.grantScope.set(null);
    this.formMode.set('create');
    this.formLoading.set(true);
    const scope = await this.loadGrantScope();
    this.formLoading.set(false);
    if (!scope) {
      this.formMode.set(null);
    }
  }

  protected async openEdit(role: RoleListItem): Promise<void> {
    if (!this.canEditRole(role)) {
      return;
    }
    this.notice.set(null);
    this.formRole.set(role);
    this.formAvailableKeys.set(null);
    this.grantScope.set(null);
    this.formMode.set('edit');
    this.formLoading.set(true);
    try {
      const [permissions, scope] = await Promise.all([
        firstValueFrom(this.rolesService.rolePermissions(role.id)),
        this.loadGrantScope(),
      ]);
      if (!scope) {
        this.closeFormState();
        return;
      }
      this.formAvailableKeys.set(permissions.availablePermissionKeys);
    } catch {
      this.closeFormState();
    } finally {
      this.formLoading.set(false);
    }
  }

  protected closeForm(): void {
    if (this.saving()) {
      return;
    }
    this.closeFormState();
  }

  protected async saveForm(result: RoleFormResult): Promise<void> {
    const mode = this.formMode();
    if (!mode || this.saving() || !this.canManage()) {
      return;
    }

    this.saving.set(true);
    let metadataSaved = false;
    try {
      if (mode === 'create') {
        const created = await firstValueFrom(
          this.rolesService.createRole({
            applicationKey: result.applicationKey,
            code: result.code,
            nameAr: result.nameAr,
            nameEn: result.nameEn,
            description: result.description,
            permissionKeys: result.permissionKeys,
          }),
        );
        this.finishForm({ key: 'roles.notice.created', name: this.roleName(created) });
        return;
      }

      const role = this.formRole();
      if (!role) {
        return;
      }
      if (!result.metadataChanged && !result.permissionsChanged) {
        this.closeFormState();
        return;
      }
      if (result.metadataChanged) {
        await firstValueFrom(
          this.rolesService.updateRole(role.id, {
            nameAr: result.nameAr,
            nameEn: result.nameEn,
            description: result.description,
            isActive: role.isActive,
          }),
        );
        metadataSaved = true;
      }
      if (result.permissionsChanged) {
        await firstValueFrom(this.rolesService.setRolePermissions(role.id, result.permissionKeys));
      }
      this.finishForm({
        key: 'roles.notice.updated',
        name: this.language.pick(result.nameAr, result.nameEn),
      });
    } catch {
      if (metadataSaved) {
        this.catalog.reload();
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected cancelDeactivate(): void {
    if (this.saving()) {
      return;
    }
    this.deactivateTarget.set(null);
  }

  protected async setActive(role: RoleListItem, isActive: boolean): Promise<void> {
    if (!this.canEditRole(role) || this.saving() || role.isActive === isActive) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.rolesService.updateRole(role.id, {
          nameAr: role.nameAr,
          nameEn: role.nameEn,
          description: role.description,
          isActive,
        }),
      );
      this.deactivateTarget.set(null);
      this.notice.set({
        key: isActive ? 'roles.notice.activated' : 'roles.notice.deactivated',
        name: this.roleName(role),
      });
      this.catalog.reload();
    } catch {
      this.deactivateTarget.set(null);
    } finally {
      this.saving.set(false);
    }
  }

  private finishForm(notice: RoleNotice): void {
    this.closeFormState();
    this.notice.set(notice);
    this.catalog.reload();
  }

  private closeFormState(): void {
    this.formMode.set(null);
    this.formRole.set(null);
    this.formAvailableKeys.set(null);
    this.grantScope.set(null);
  }

  private async loadGrantScope(): Promise<RoleGrantScope | null> {
    try {
      const scope = await firstValueFrom(this.rolesService.loadGrantScope());
      this.grantScope.set(scope);
      return scope;
    } catch {
      return null;
    }
  }

  private async loadRoleMembers(roleId: string): Promise<void> {
    this.roleMembers.set([]);
    if (!this.canReadMembers()) {
      return;
    }
    this.membersLoading.set(true);
    try {
      const [holders, members] = await Promise.all([
        firstValueFrom(this.rolesService.roleMemberships(roleId)),
        firstValueFrom(this.rolesService.loadMembers()),
      ]);
      if (this.selectedId() !== roleId) {
        return;
      }
      const ids = new Set(holders.tenantMembershipIds);
      this.roleMembers.set(
        members
          .filter((member) => ids.has(member.tenantMembershipId))
          .sort((a, b) =>
            this.language
              .pick(a.arabicName, a.englishName)
              .localeCompare(this.language.pick(b.arabicName, b.englishName)),
          ),
      );
    } catch {
      this.roleMembers.set([]);
    } finally {
      if (this.selectedId() === roleId) {
        this.membersLoading.set(false);
      }
    }
  }
}
