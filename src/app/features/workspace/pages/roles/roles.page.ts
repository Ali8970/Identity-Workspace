import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { applicationModifier } from '../../../../shared/ui/display';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import { ListFilterBar } from '../../../../shared/ui/list-filter-bar/list-filter-bar';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
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
    PageHeader,
    ListStats,
    ListFilterBar,
    EmptyState,
    ErrorPanel,
  ],
  template: `
    <div>
      <app-page-header
        [title]="'roles.title' | translate"
        [description]="(canManage() ? 'roles.subtitle' : 'roles.subtitleReadOnly') | translate"
      >
        @if (canManage()) {
          <button
            type="button"
            class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
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
              class="size-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {{ 'roles.add' | translate }}
          </button>
        }
      </app-page-header>

      <div class="mb-4">
        <app-list-stats [stats]="roleStats()" [loading]="initialLoading()" />
      </div>

      @if (notice(); as current) {
        <div
          class="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border-[1.468px] border-success bg-success-bg px-4 py-3 text-[13px] text-success-text"
          role="status"
        >
          <span class="min-w-0 flex-1">
            {{ current.key | translate: { name: current.name } }}
          </span>
          <button
            type="button"
            class="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-success-text hover:bg-surface"
            [attr.aria-label]="'roles.notice.dismiss' | translate"
            (click)="notice.set(null)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
              class="size-4"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      }

      @if (initialLoading()) {
        <app-roles-skeleton [label]="'roles.loading' | translate" />
      } @else if (loadFailed()) {
        <app-error-panel
          [title]="'common.loadFailed' | translate"
          [retryLabel]="'common.retry' | translate"
          (retry)="reload()"
        />
      } @else {
        <section
          class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
          aria-labelledby="roles-list-heading"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3"
          >
            <h2 class="m-0 text-[14px] font-bold text-text" id="roles-list-heading">
              {{ 'roles.listTitle' | translate }}
            </h2>
            <span class="text-[12px] text-text-muted" aria-live="polite">
              {{
                'roles.showing' | translate: { shown: visibleRoles().length, total: roles().length }
              }}
            </span>
          </div>

          <app-list-filter-bar
            [searchControl]="searchDraft"
            [searchPlaceholder]="'roles.search' | translate"
            [otherFiltersLabel]="'roles.otherFilters' | translate"
            [applyLabel]="'roles.applyFilters' | translate"
            [clearLabel]="'roles.clearFilters' | translate"
            [activeFilterCount]="activeFilterCount()"
            (apply)="applyFilters()"
            (clear)="clearFilters()"
          >
            <label class="flex min-w-[10rem] flex-col gap-1 text-[12px] font-medium text-text-muted">
              {{ 'roles.filterApplication' | translate }}
              <select
                class="list-filter-control field-control"
                [value]="applicationDraft()"
                (change)="applicationDraft.set($any($event.target).value)"
              >
                <option value="">{{ 'roles.filterAllApplications' | translate }}</option>
                @for (application of applications(); track application.key) {
                  <option [value]="application.key">{{ application.label }}</option>
                }
              </select>
            </label>
            <label class="flex min-w-[10rem] flex-col gap-1 text-[12px] font-medium text-text-muted">
              {{ 'roles.filterStatus' | translate }}
              <select
                class="list-filter-control field-control"
                [value]="statusDraft()"
                (change)="statusDraft.set($any($event.target).value)"
              >
                <option value="">{{ 'roles.filterAllStatuses' | translate }}</option>
                <option value="active">{{ 'roles.active' | translate }}</option>
                <option value="inactive">{{ 'roles.inactive' | translate }}</option>
              </select>
            </label>
          </app-list-filter-bar>

          @if (roles().length === 0) {
            <app-empty-state
              [title]="(canManage() ? 'roles.emptyTitle' : 'roles.emptyReadOnly') | translate"
              [detail]="canManage() ? ('roles.emptyBodyManage' | translate) : undefined"
              [actionLabel]="
                canManage() && applications().length > 0 ? ('roles.add' | translate) : undefined
              "
              (action)="openCreate()"
            />
          } @else if (visibleRoles().length === 0) {
            <app-empty-state
              [title]="'roles.noResults' | translate"
              [actionLabel]="'roles.clearFilters' | translate"
              (action)="clearFilters()"
            />
          } @else {
            <ul
              class="m-0 grid list-none gap-3 p-[18px] [grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))]"
            >
              @for (role of visibleRoles(); track role.id) {
                @let name = roleName(role);
                @let editable = canEditRole(role);
                <li
                  class="relative flex min-w-0 flex-col gap-2.5 rounded-[10px] border-[1.468px] border-border-button bg-surface p-4 font-[family-name:var(--font-family)] shadow-[var(--shadow-card)]"
                  [class.border-info]="role.isOwnerRole"
                  [class.bg-surface-muted]="!role.isActive"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold tracking-wide text-text-muted uppercase"
                    >
                      <span
                        [class]="
                          'grid size-6 shrink-0 place-items-center rounded-md bg-primary-light text-info workspace-app-group__icon--' +
                          applicationModifier(role.applicationKey)
                        "
                        aria-hidden="true"
                      >
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
                      </span>
                      <bdi class="truncate">{{ appLabel(role.applicationKey) }}</bdi>
                    </span>
                    <span
                      class="workspace-status-pill"
                      [class.workspace-status-pill--active]="role.isActive"
                      [class.workspace-role-status--inactive]="!role.isActive"
                    >
                      {{ (role.isActive ? 'roles.active' : 'roles.inactive') | translate }}
                    </span>
                  </div>

                  <h3 class="m-0 text-[15px] leading-snug font-bold text-text">{{ name }}</h3>

                  <div class="flex flex-wrap gap-1.5">
                    @if (role.isOwnerRole) {
                      <span
                        class="inline-flex items-center gap-1 rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-info-text"
                      >
                        {{ 'roles.ownerRole' | translate }}
                      </span>
                    } @else if (role.isSystem) {
                      <span
                        class="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted"
                      >
                        {{ 'roles.systemRole' | translate }}
                      </span>
                    } @else {
                      <span
                        class="rounded-md border-[1.468px] border-border-button px-2 py-0.5 text-[11px] font-semibold text-text"
                      >
                        {{ 'roles.customRole' | translate }}
                      </span>
                    }
                  </div>

                  <p
                    class="m-0 min-h-[2.6em] text-[13px] leading-normal text-text-muted"
                    [class.italic]="!role.description"
                  >
                    {{ role.description || ('roles.noDescription' | translate) }}
                  </p>

                  <div class="mt-auto flex items-center justify-between gap-2 border-t-[1.468px] border-border-subtle pt-3">
                    <span class="text-[12px] font-medium text-text-muted">
                      {{
                        'roles.permissionCount' | translate: { count: role.permissionKeys.length }
                      }}
                    </span>

                    <button
                      type="button"
                      class="table-row-action-icon"
                      aria-haspopup="dialog"
                      [id]="'role-card-' + role.id"
                      [attr.aria-label]="
                        (editable ? 'roles.manageRoleFor' : 'roles.viewRoleFor')
                          | translate: { name: name }
                      "
                      [attr.title]="(editable ? 'roles.manageRole' : 'roles.viewRole') | translate"
                      (click)="openDetails(role)"
                    >
                      <img
                        class="table-row-action-glyph"
                        src="/images/table-actions/eye.svg"
                        width="16"
                        height="16"
                        alt=""
                      />
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
  private readonly translate = inject(TranslateService);
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

  /** Applied filters — drive the visible list. */
  protected readonly search = signal('');
  protected readonly applicationFilter = signal('');
  protected readonly statusFilter = signal<StatusFilter>('');

  /** Draft filters — commit only on Apply / Enter. */
  protected readonly searchDraft = new FormControl('', { nonNullable: true });
  protected readonly applicationDraft = signal('');
  protected readonly statusDraft = signal<StatusFilter>('');

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

  protected readonly roleStats = computed((): ListStatCard[] => {
    this.language.current();
    const rows = this.roles();
    const active = rows.filter((role) => role.isActive).length;
    const inactive = rows.length - active;
    return [
      {
        label: this.translate.instant('roles.stats.total'),
        value: rows.length,
        accent: '#2b5bf9',
        icon: 'values',
      },
      {
        label: this.translate.instant('roles.stats.applications'),
        value: this.applications().length,
        accent: '#1e00b0',
        icon: 'apps',
      },
      {
        label: this.translate.instant('roles.stats.active'),
        value: active,
        accent: '#0fbc15',
        icon: 'active',
      },
      {
        label: this.translate.instant('roles.stats.inactive'),
        value: inactive,
        accent: '#f57c00',
        icon: 'warning',
        valueTone: inactive > 0 ? 'danger' : 'default',
      },
    ];
  });

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

  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.search().trim()) {
      count += 1;
    }
    if (this.applicationFilter()) {
      count += 1;
    }
    if (this.statusFilter()) {
      count += 1;
    }
    return count;
  });

  protected reload(): void {
    this.catalog.reload();
  }

  protected applyFilters(): void {
    this.search.set(this.searchDraft.value);
    this.applicationFilter.set(this.applicationDraft());
    this.statusFilter.set(this.statusDraft());
  }

  protected clearFilters(): void {
    this.searchDraft.setValue('');
    this.applicationDraft.set('');
    this.statusDraft.set('');
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
