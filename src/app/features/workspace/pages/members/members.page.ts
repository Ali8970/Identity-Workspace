import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { form, minLength, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TenantMembershipStatus } from '../../../../enums/domain.enums';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { nameInitials } from '../../../../shared/ui/display';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorPanel } from '../../../../shared/ui/error-panel/error-panel';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import { ListFilterBar } from '../../../../shared/ui/list-filter-bar/list-filter-bar';
import type { ListStatCard } from '../../../../shared/ui/list-stats/list-stat-card';
import { ListStats } from '../../../../shared/ui/list-stats/list-stats';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import {
  AddMemberFormValue,
  AddMemberResult,
  MemberListItem,
  MemberRolesDto,
  ResendActivationResult,
  RoleListItem,
  TeamListItem,
  TeamNode,
} from '../../models/workspace-feature.model';
import { MEMBER_STATUSES, MembersService } from '../../services/members.service';
import { RoleGrantScope } from '../../services/roles.service';
import { MemberInviteDialog } from './member-invite-dialog';
import { MembersSkeleton } from './members.skeleton';

@Component({
  selector: 'app-members-page',
  imports: [
    TranslatePipe,
    FocusTrap,
    ConfirmDialog,
    MembersSkeleton,
    MemberInviteDialog,
    PageHeader,
    ListStats,
    ListFilterBar,
    EmptyState,
    ErrorPanel,
  ],
  template: `
    <div>
      <app-page-header
        [title]="'members.title' | translate"
        [description]="'members.subtitle' | translate"
      >
        @if (canCreate()) {
          <button
            type="button"
            class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary"
            (click)="openInvite()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" class="size-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {{ 'members.add' | translate }}
          </button>
        }
      </app-page-header>

      <div class="mb-4">
        <app-list-stats [stats]="memberStats()" [loading]="loading()" />
      </div>

      @if (loading()) {
        <app-members-skeleton [label]="'members.loading' | translate" />
      } @else if (loadFailed()) {
        <app-error-panel
          [title]="'common.loadFailed' | translate"
          [retryLabel]="'common.retry' | translate"
          (retry)="reload()"
        />
      } @else {
        @if (inviteResult(); as result) {
          <div class="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border-[1.468px] border-success bg-success-bg px-4 py-3 text-[13px] text-success-text" role="status">
            <span class="min-w-0 flex-1">
              {{ inviteResultMessage(result) | translate: { email: result.email } }}
            </span>
            @if (invitedMember(); as invited) {
              <button type="button" class="inline-flex h-8 cursor-pointer items-center rounded-lg border-[1.468px] border-border-button bg-surface px-3 text-[12px] font-semibold text-text hover:bg-surface-muted" (click)="openDetail(invited)">
                {{ 'members.invite.viewMember' | translate }}
              </button>
            }
          </div>
        }

        @if (resendResult(); as resent) {
          <div class="mb-4 rounded-[10px] border-[1.468px] border-success bg-success-bg px-4 py-3 text-[13px] text-success-text" role="status">
            {{
              (resent.reusedExistingToken ? 'members.resendReused' : 'members.resendNew')
                | translate: { email: resent.email }
            }}
          </div>
        }

        <section
          class="list-table-panel overflow-hidden rounded-[10px] border-[1.468px] border-border-button bg-surface shadow-[var(--shadow-card)]"
          aria-labelledby="members-list-heading"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 border-b-[1.468px] border-border-subtle px-[18px] py-3">
            <h2 class="m-0 text-[14px] font-bold text-text" id="members-list-heading">
              {{ 'members.listTitle' | translate }}
            </h2>
            <span class="text-[12px] text-text-muted">
              {{
                'members.showing'
                  | translate: { shown: visibleMembers().length, total: members().length }
              }}
            </span>
          </div>

          <app-list-filter-bar
            [searchControl]="searchDraft"
            [searchPlaceholder]="'members.search' | translate"
            [otherFiltersLabel]="'members.otherFilters' | translate"
            [applyLabel]="'members.applyFilters' | translate"
            [clearLabel]="'members.clearFilters' | translate"
            [activeFilterCount]="activeFilterCount()"
            [disabled]="refreshing()"
            (apply)="applyFilters()"
            (clear)="clearFilters()"
          >
            <label class="flex min-w-[10rem] flex-col gap-1 text-[12px] font-medium text-text-muted">
              {{ 'members.filterRoleLabel' | translate }}
              <select class="list-filter-control field-control" [value]="roleDraft()" (change)="roleDraft.set($any($event.target).value)">
                <option value="">{{ 'members.filterAllRoles' | translate }}</option>
                @for (role of roles(); track role.id) {
                  <option [value]="role.id">{{ language.pick(role.nameAr, role.nameEn) }}</option>
                }
              </select>
            </label>
            <label class="flex min-w-[10rem] flex-col gap-1 text-[12px] font-medium text-text-muted">
              {{ 'members.filterStatusLabel' | translate }}
              <select class="list-filter-control field-control" [value]="statusDraft()" (change)="statusDraft.set($any($event.target).value)">
                <option value="">{{ 'members.filterAllStatuses' | translate }}</option>
                @for (status of statusOptions; track status) {
                  <option [value]="status">{{ statusLabel(status) | translate }}</option>
                }
              </select>
            </label>
          </app-list-filter-bar>

          @if (members().length === 0) {
            <app-empty-state
              [title]="'members.empty' | translate"
              [actionLabel]="canCreate() ? ('members.add' | translate) : undefined"
              (action)="openInvite()"
            />
          } @else if (visibleMembers().length === 0) {
            <app-empty-state
              [title]="'members.noResults' | translate"
              [detail]="'members.noResultsBody' | translate: { count: members().length }"
              [actionLabel]="'members.clearFilters' | translate"
              (action)="clearFilters()"
            />
          } @else {
            <div class="list-table-body overflow-x-auto">
              <table class="w-full border-collapse text-start">
                <thead class="bg-table-head">
                  <tr>
                    <th scope="col" class="px-[18px] py-3 text-text-muted uppercase">{{ 'members.colName' | translate }}</th>
                    <th scope="col" class="px-3 py-3 text-text-muted uppercase">{{ 'members.colRoles' | translate }}</th>
                    <th scope="col" class="px-3 py-3 text-text-muted uppercase">{{ 'members.colStatus' | translate }}</th>
                    <th scope="col" class="px-[18px] py-3 text-center text-text-muted uppercase">{{ 'members.colActions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of visibleMembers(); track row.tenantMembershipId) {
                    <tr class="border-t-[1.468px] border-border-subtle hover:bg-surface-muted/60">
                      <td class="px-[18px] py-[15px]">
                        <div class="flex items-center gap-3">
                          <span class="grid size-9 shrink-0 place-items-center rounded-2xl text-xs font-bold text-on-primary" style="background: var(--primary-gradient)" aria-hidden="true">{{ initials(row) }}</span>
                          <span class="min-w-0">
                            <span class="flex flex-wrap items-center gap-1.5">
                              <span class="list-table-name text-text">{{ language.pick(row.arabicName, row.englishName) }}</span>
                              @if (row.isOwner) {
                                <span class="rounded-md bg-primary-light px-1.5 py-0.5 text-[11px] font-semibold leading-[16.5px] text-info-text">{{ 'members.owner' | translate }}</span>
                              }
                              @if (isPending(row)) {
                                <span class="rounded-md bg-warning-bg px-1.5 py-0.5 text-[11px] font-semibold leading-[16.5px] text-warning-text">{{ 'members.pendingActivation' | translate }}</span>
                              }
                            </span>
                            <span class="mt-0.5 block truncate text-[12px] font-normal text-text-muted ltr-text">{{ row.email }}</span>
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-[15px]">
                        <div class="flex flex-wrap gap-1">
                          @if (row.roles.length === 0) {
                            <span class="text-[12px] font-normal text-text-muted">{{ 'members.noRoles' | translate }}</span>
                          } @else {
                            @for (role of row.roles; track role.roleId) {
                              <span class="rounded-md border-[1.468px] border-border-button bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text">{{ language.pick(role.nameAr, role.nameEn) }}</span>
                            }
                          }
                        </div>
                      </td>
                      <td class="px-3 py-[15px]">
                        @if (isKnownStatus(row.tenantMembershipStatus)) {
                          <span [class]="statusClass(row.tenantMembershipStatus)">{{ statusLabel(row.tenantMembershipStatus) | translate }}</span>
                        } @else {
                          <span class="workspace-status-pill">{{ row.tenantMembershipStatus }}</span>
                        }
                      </td>
                      <td class="px-[18px] py-[15px]">
                        <div class="flex flex-nowrap items-center justify-center gap-2">
                          <button
                            type="button"
                            class="table-row-action-icon"
                            [attr.aria-label]="'members.details' | translate"
                            [attr.title]="'members.details' | translate"
                            (click)="openDetail(row)"
                          >
                            <img class="table-row-action-glyph" src="/images/table-actions/eye.svg" width="16" height="16" alt="" />
                          </button>
                          @if (canManage()) {
                            @if (isPending(row)) {
                              <button
                                type="button"
                                class="table-row-action-icon"
                                [disabled]="resendingId() !== null"
                                [attr.aria-busy]="resendingId() === row.tenantMembershipId"
                                [attr.aria-label]="'members.resendFor' | translate: { name: language.pick(row.arabicName, row.englishName) }"
                                [attr.title]="'members.resend' | translate"
                                (click)="resend(row)"
                              >
                                <img class="table-row-action-glyph" src="/images/table-actions/mail.svg" width="16" height="16" alt="" />
                              </button>
                            }
                            @if (isActive(row)) {
                              <button
                                type="button"
                                class="table-row-action-icon"
                                [attr.aria-label]="'members.editRolesFor' | translate: { name: language.pick(row.arabicName, row.englishName) }"
                                [attr.title]="'members.editRoles' | translate"
                                (click)="openEditRoles(row)"
                              >
                                <img class="table-row-action-glyph table-row-action-glyph--edit" src="/images/table-actions/edit.svg" width="16" height="16" alt="" />
                              </button>
                            }
                            @if (!row.isOwner) {
                              <button
                                type="button"
                                class="table-row-action-icon"
                                [attr.aria-label]="'members.removeFor' | translate: { name: language.pick(row.arabicName, row.englishName) }"
                                [attr.title]="'members.remove' | translate"
                                (click)="askRemove(row)"
                              >
                                <img class="table-row-action-glyph" src="/images/table-actions/trash.svg" width="16" height="16" alt="" />
                              </button>
                            }
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </div>

    @if (editingMember(); as member) {
      <div class="workspace-dialog" role="presentation">
        <button
          type="button"
          class="workspace-dialog__backdrop"
          [attr.aria-label]="'members.editRolesCancel' | translate"
          (click)="closeEditRoles()"
        ></button>
        <div
          class="workspace-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-member-roles-title"
          appFocusTrap
          (dismiss)="closeEditRoles()"
        >
          <header class="workspace-dialog__head">
            <div>
              <h2 class="workspace-dialog__title" id="edit-member-roles-title">
                {{ 'members.editRolesTitle' | translate }}
              </h2>
              <p class="workspace-dialog__lead">
                {{
                  'members.editRolesLead'
                    | translate: { name: language.pick(member.arabicName, member.englishName) }
                }}
              </p>
            </div>
            <button
              type="button"
              class="workspace-dialog__close"
              [attr.aria-label]="'members.editRolesCancel' | translate"
              (click)="closeEditRoles()"
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
          </header>

          <div class="workspace-dialog__body">
            <form class="workspace-form" (submit)="saveRoles($event)" novalidate>
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
                <span>{{ 'members.editRolesReplaceWarning' | translate }}</span>
              </aside>

              <div class="mb-3.5 flex flex-col gap-1">
                <span class="text-[12px] font-semibold text-text-muted" id="edit-member-roles-label">
                  {{ 'members.roles' | translate }}
                  <span class="text-danger" aria-hidden="true">*</span>
                </span>

                @if (memberRolesLoading()) {
                  <div
                    class="workspace-loading workspace-loading--compact"
                    role="status"
                    aria-live="polite"
                  >
                    <span class="workspace-loading__spinner" aria-hidden="true"></span>
                    <span>{{ 'members.editRolesLoading' | translate }}</span>
                  </div>
                } @else {
                  <div role="group" aria-labelledby="edit-member-roles-label">
                    @for (group of editRoleGroups(); track group.applicationKey) {
                      <section class="workspace-app-group">
                        <header class="workspace-app-group__head">
                          <h3 class="workspace-app-group__title">{{ group.label }}</h3>
                          <span class="workspace-chip workspace-chip--muted">
                            {{
                              'members.rolesSelectedCount'
                                | translate: { count: group.selectedCount }
                            }}
                          </span>
                        </header>

                        @for (role of group.roles; track role.id) {
                          <label class="workspace-role-choice">
                            <input
                              type="checkbox"
                              [checked]="isRoleSelected(role.id)"
                              [disabled]="savingRoles() || isRoleLocked(role)"
                              (change)="toggleEditRole(role)"
                            />
                            <span class="workspace-role-choice__body">
                              <span class="workspace-role-choice__name">
                                {{ language.pick(role.nameAr, role.nameEn) }}
                              </span>
                              <span class="workspace-role-choice__meta">
                                {{ role.code }}
                                @if (!role.isActive) {
                                  · {{ 'roles.inactive' | translate }}
                                }
                                @if (isRoleLocked(role)) {
                                  · {{ 'members.ownerRoleLocked' | translate }}
                                }
                              </span>
                            </span>
                          </label>
                        }

                        @if (group.currentPermissions.length > 0) {
                          <details class="workspace-perm-group">
                            <summary class="workspace-perm-group__head">
                              <span class="workspace-perm-group__title">
                                {{ 'members.currentPermissions' | translate }}
                              </span>
                              <span class="workspace-chip workspace-chip--muted">
                                {{
                                  'roles.permissionCount'
                                    | translate: { count: group.currentPermissions.length }
                                }}
                              </span>
                            </summary>
                            <ul class="workspace-perm-list">
                              @for (key of group.currentPermissions; track key) {
                                <li class="workspace-perm-item">{{ key }}</li>
                              }
                            </ul>
                          </details>
                        }
                      </section>
                    } @empty {
                      <p class="workspace-dialog__empty" role="status">
                        {{ 'members.rolesEmpty' | translate }}
                      </p>
                    }
                  </div>
                }

                @if (editForm.roleIds().touched() && editForm.roleIds().invalid()) {
                  <p class="m-0 text-[12px] text-danger" id="edit-member-roles-error" role="alert">
                    {{ 'members.rolesRequired' | translate }}
                  </p>
                } @else {
                  <p class="workspace-field-hint" id="edit-member-roles-hint">
                    {{ 'members.editRolesHint' | translate }}
                  </p>
                }
              </div>

              <div class="workspace-form__actions workspace-dialog__actions">
                <button
                  type="button"
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="savingRoles()"
                  (click)="closeEditRoles()"
                >
                  {{ 'members.editRolesCancel' | translate }}
                </button>
                <button
                  type="submit"
                  class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="savingRoles() || editForm().invalid()"
                  [attr.aria-busy]="savingRoles()"
                >
                  @if (savingRoles()) {
                    {{ 'members.editRolesSaving' | translate }}
                  } @else {
                    {{ 'members.editRolesSave' | translate }}
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    @if (detailMember(); as member) {
      <div class="workspace-dialog" role="presentation">
        <button
          type="button"
          class="workspace-dialog__backdrop"
          [attr.aria-label]="'common.close' | translate"
          (click)="closeDetail()"
        ></button>
        <div
          class="workspace-dialog__panel workspace-dialog__panel--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-detail-title"
          appFocusTrap
          (dismiss)="closeDetail()"
        >
          <header class="workspace-dialog__head">
            <div>
              <h2 class="workspace-dialog__title" id="member-detail-title">
                {{ language.pick(member.arabicName, member.englishName) }}
              </h2>
              <p class="workspace-dialog__lead ltr-text">{{ member.email }}</p>
            </div>
            <button
              type="button"
              class="workspace-dialog__close"
              [attr.aria-label]="'common.close' | translate"
              (click)="closeDetail()"
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
          </header>

          <div class="workspace-dialog__body">
            <dl class="workspace-dl">
              <div class="workspace-dl__row">
                <dt class="workspace-dl__label">{{ 'members.colStatus' | translate }}</dt>
                <dd class="workspace-dl__value">
                  @if (isKnownStatus(member.tenantMembershipStatus)) {
                    <span [class]="statusClass(member.tenantMembershipStatus)">
                      {{ statusLabel(member.tenantMembershipStatus) | translate }}
                    </span>
                  } @else {
                    <span class="workspace-status-pill">{{ member.tenantMembershipStatus }}</span>
                  }
                </dd>
              </div>
              <div class="workspace-dl__row">
                <dt class="workspace-dl__label">{{ 'members.jobTitle' | translate }}</dt>
                <dd class="workspace-dl__value">
                  {{ member.jobTitle || ('members.noJobTitle' | translate) }}
                </dd>
              </div>
              <div class="workspace-dl__row">
                <dt class="workspace-dl__label">{{ 'members.activation' | translate }}</dt>
                <dd class="workspace-dl__value">
                  {{
                    (isPending(member) ? 'members.pendingActivation' : 'members.activated')
                      | translate
                  }}
                </dd>
              </div>
              @if (member.isOwner) {
                <div class="workspace-dl__row">
                  <dt class="workspace-dl__label">{{ 'members.owner' | translate }}</dt>
                  <dd class="workspace-dl__value">{{ 'common.yes' | translate }}</dd>
                </div>
              }
            </dl>

            @if (detailTeamsLoading()) {
              <div
                class="workspace-loading workspace-loading--compact"
                role="status"
                aria-live="polite"
              >
                <span class="workspace-loading__spinner" aria-hidden="true"></span>
                <span>{{ 'members.detailLoading' | translate }}</span>
              </div>
            } @else {
              @for (group of detailAccess(); track group.applicationKey) {
                <section class="workspace-app-group">
                  <header class="workspace-app-group__head">
                    <h3 class="workspace-app-group__title">{{ group.label }}</h3>
                  </header>

                  <p class="workspace-field-hint">{{ 'members.roles' | translate }}</p>
                  <div class="workspace-role-list">
                    @for (role of group.roles; track role.id) {
                      <span class="workspace-role-pill">
                        {{ language.pick(role.nameAr, role.nameEn) }}
                      </span>
                    } @empty {
                      <span class="workspace-role-pill workspace-role-pill--empty">
                        {{ 'members.noRoles' | translate }}
                      </span>
                    }
                  </div>

                  <p class="workspace-field-hint">{{ 'members.teams' | translate }}</p>
                  <div class="workspace-role-list">
                    @for (team of group.teams; track team.id) {
                      <span class="workspace-role-pill">{{ team.name }}</span>
                    } @empty {
                      <span class="workspace-role-pill workspace-role-pill--empty">
                        {{ 'members.noTeams' | translate }}
                      </span>
                    }
                  </div>
                </section>
              } @empty {
                <p class="workspace-dialog__empty" role="status">
                  {{ 'members.noAccess' | translate }}
                </p>
              }
            }

            <div class="workspace-form__actions workspace-dialog__actions">
              <button type="button" class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50" (click)="closeDetail()">
                {{ 'common.close' | translate }}
              </button>
              @if (canManage() && !member.isOwner) {
                <button type="button" class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-danger px-3.5 text-[13px] font-semibold text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" (click)="askRemove(member)">
                  {{ 'members.remove' | translate }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    @if (canCreate() && inviteOpen()) {
      <app-member-invite-dialog
        [catalog]="inviteCatalog()"
        [grantScope]="grantScope()"
        [grantScopeLoading]="grantScopeLoading()"
        [saving]="busy()"
        (closed)="closeInvite()"
        (submitted)="onInvite($event)"
      />
    }

    @if (removeTarget()) {
      <app-confirm-dialog
        title="members.removeTitle"
        body="members.removeBody"
        [bodyParams]="{ name: removeName() }"
        confirmLabel="members.removeConfirm"
        cancelLabel="members.removeCancel"
        busyLabel="members.removing"
        [destructive]="true"
        [busy]="removing()"
        (confirmed)="confirmRemove()"
        (cancelled)="cancelRemove()"
      />
    }
  `,
})
export class MembersPage {
  private readonly membersService = inject(MembersService);
  private readonly session = inject(SessionStore);
  private readonly applicationLabels = inject(ApplicationLabels);
  private readonly translate = inject(TranslateService);
  protected readonly language = inject(LanguageService);

  /** Applied status — drives the members list API. */
  protected readonly statusFilter = signal<TenantMembershipStatus | ''>('');
  /** Draft filters — applied only on Apply / Enter. */
  protected readonly searchDraft = new FormControl('', { nonNullable: true });
  protected readonly roleDraft = signal('');
  protected readonly statusDraft = signal<TenantMembershipStatus | ''>('');

  private readonly directory = rxResource({
    // Keyed on the active company: switching companies re-fetches automatically,
    // so no route remount is needed to refresh tenant-scoped lists.
    params: () => ({
      tenant: this.session.currentTenant()?.tenantMembershipId,
      status: this.statusFilter(),
    }),
    stream: ({ params }) => this.membersService.loadMembers(params.status),
    defaultValue: [] as MemberListItem[],
  });

  private readonly lookups = rxResource({
    params: () => this.session.currentTenant()?.tenantMembershipId,
    stream: () => this.membersService.loadLookups(),
    defaultValue: { roles: [], teams: [] } as { roles: RoleListItem[]; teams: TeamNode[] },
  });

  protected readonly members = this.directory.value;
  protected readonly roles = computed(() => this.lookups.value().roles);
  protected readonly inviteCatalog = computed(() =>
    this.membersService.inviteCatalog(this.roles(), this.lookups.value().teams),
  );
  protected readonly loading = computed(
    () => this.lookups.isLoading() || (this.directory.isLoading() && !this.directory.hasValue()),
  );
  protected readonly refreshing = this.directory.isLoading;
  /** The error interceptor already raised the banner; this only offers the retry. */
  protected readonly loadFailed = computed(
    () => this.directory.status() === 'error' || this.lookups.status() === 'error',
  );

  protected readonly busy = signal(false);
  protected readonly inviteOpen = signal(false);
  protected readonly inviteResult = signal<AddMemberResult | null>(null);
  protected readonly grantScope = signal<RoleGrantScope | null>(null);
  protected readonly grantScopeLoading = signal(false);
  protected readonly invitedMember = computed(() => {
    const result = this.inviteResult();
    return result
      ? (this.members().find((row) => row.tenantMembershipId === result.tenantMembershipId) ??
          null)
      : null;
  });

  /* Search + role filter client-side over the loaded list. Status is applied
     via the directory resource (API). Draft values only commit on Apply. */
  protected readonly search = signal('');
  protected readonly roleFilter = signal('');

  protected readonly statusOptions = MEMBER_STATUSES;

  protected readonly memberStats = computed((): ListStatCard[] => {
    this.language.current();
    const rows = this.members();
    const active = rows.filter((row) => row.tenantMembershipStatus === 'Active').length;
    const suspended = rows.filter((row) => row.tenantMembershipStatus === 'Suspended').length;
    const pending = rows.filter((row) => this.isPending(row)).length;
    return [
      {
        label: this.translate.instant('members.stats.total'),
        value: rows.length,
        accent: '#2b5bf9',
        icon: 'users',
      },
      {
        label: this.translate.instant('members.stats.active'),
        value: active,
        accent: '#0fbc15',
        icon: 'active',
      },
      {
        label: this.translate.instant('members.stats.suspended'),
        value: suspended,
        accent: '#f57c00',
        icon: 'warning',
        valueTone: suspended > 0 ? 'danger' : 'default',
      },
      {
        label: this.translate.instant('members.stats.pending'),
        value: pending,
        accent: '#1e00b0',
        icon: 'info',
      },
    ];
  });

  protected readonly visibleMembers = computed(() => {
    const term = this.search().trim().toLowerCase();
    const role = this.roleFilter();

    return this.members().filter((row) => {
      if (role && !row.roles.some((entry) => entry.roleId === role)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [row.email, row.arabicName, row.englishName].some((value) =>
        (value ?? '').toLowerCase().includes(term),
      );
    });
  });

  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.search().trim()) {
      count += 1;
    }
    if (this.roleFilter()) {
      count += 1;
    }
    if (this.statusFilter()) {
      count += 1;
    }
    return count;
  });

  protected readonly resendingId = signal<string | null>(null);
  protected readonly resendResult = signal<ResendActivationResult | null>(null);

  protected readonly detailMember = signal<MemberListItem | null>(null);
  protected readonly detailTeams = signal<TeamListItem[]>([]);
  protected readonly detailTeamsLoading = signal(false);

  protected readonly removeTarget = signal<MemberListItem | null>(null);
  protected readonly removing = signal(false);

  protected readonly editingMember = signal<MemberListItem | null>(null);
  protected readonly memberRoles = signal<MemberRolesDto | null>(null);
  protected readonly memberRolesLoading = signal(false);
  protected readonly savingRoles = signal(false);
  protected readonly editModel = signal({ roleIds: [] as string[] });
  protected readonly editForm = form(this.editModel, (schema) => {
    minLength(schema.roleIds, 1);
  });

  protected readonly canManage = computed(() => this.membersService.canCreateMembers());
  /** Invite panel uses the same memberships.manage permission. */
  protected readonly canCreate = this.canManage;

  protected readonly editRoleGroups = computed(() => {
    const member = this.editingMember();
    if (!member) {
      return [];
    }
    const held = new Set(this.memberRoles()?.roles.map((role) => role.id) ?? []);
    const effective = this.memberRoles()?.effectivePermissionsByApplication ?? {};
    const selected = new Set(this.editModel().roleIds);

    const groups = new Map<string, RoleListItem[]>();
    for (const role of this.roles()) {
      if (!role.isActive && !held.has(role.id)) {
        continue;
      }
      const bucket = groups.get(role.applicationKey) ?? [];
      bucket.push(role);
      groups.set(role.applicationKey, bucket);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([applicationKey, roles]) => ({
        applicationKey,
        label: this.applicationLabels.label(applicationKey) || applicationKey,
        roles: [...roles].sort(
          (a, b) =>
            Number(b.isOwnerRole) - Number(a.isOwnerRole) ||
            this.language
              .pick(a.nameAr, a.nameEn)
              .localeCompare(this.language.pick(b.nameAr, b.nameEn)),
        ),
        selectedCount: roles.filter((role) => selected.has(role.id)).length,
        currentPermissions: effective[applicationKey] ?? [],
      }));
  });

  protected readonly detailAccess = computed(() => {
    const member = this.detailMember();
    if (!member) {
      return [];
    }
    const teams = this.detailTeams();
    const keys = new Set<string>();
    for (const role of this.roles()) {
      if (member.roles.some((held) => held.roleId === role.id)) {
        keys.add(role.applicationKey);
      }
    }
    for (const team of teams) {
      if (team.applicationKey) {
        keys.add(team.applicationKey);
      }
    }

    return [...keys].sort().map((applicationKey) => ({
      applicationKey,
      label: this.applicationLabels.label(applicationKey) || applicationKey,
      teams: teams.filter((team) => team.applicationKey === applicationKey),
      roles: this.roles().filter(
        (role) =>
          role.applicationKey === applicationKey &&
          member.roles.some((held) => held.roleId === role.id),
      ),
    }));
  });

  protected reload(): void {
    this.directory.reload();
    this.lookups.reload();
  }

  protected applyFilters(): void {
    this.search.set(this.searchDraft.value);
    this.roleFilter.set(this.roleDraft());
    this.statusFilter.set(this.statusDraft());
  }

  protected clearFilters(): void {
    this.searchDraft.setValue('');
    this.roleDraft.set('');
    this.statusDraft.set('');
    this.search.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
  }

  protected isPending(row: MemberListItem): boolean {
    return this.membersService.activationOf(row) === 'pending';
  }

  protected isActive(row: MemberListItem): boolean {
    return row.tenantMembershipStatus === 'Active';
  }

  protected async resend(row: MemberListItem): Promise<void> {
    if (!this.canManage() || this.resendingId() !== null) {
      return;
    }
    this.resendingId.set(row.tenantMembershipId);
    this.resendResult.set(null);
    try {
      const result = await firstValueFrom(
        this.membersService.resendActivation(row.tenantMembershipId),
      );
      this.resendResult.set(result);
    } finally {
      this.resendingId.set(null);
    }
  }

  protected async openDetail(row: MemberListItem): Promise<void> {
    this.detailMember.set(row);
    this.detailTeams.set([]);
    this.detailTeamsLoading.set(true);
    try {
      const teams = await firstValueFrom(
        this.membersService.loadMemberTeams(row.tenantMembershipId),
      );
      this.detailTeams.set(teams.filter((team) => team.status === 'Active'));
    } catch {
      this.detailTeams.set([]);
    } finally {
      this.detailTeamsLoading.set(false);
    }
  }

  protected closeDetail(): void {
    this.detailMember.set(null);
    this.detailTeams.set([]);
  }

  protected askRemove(row: MemberListItem): void {
    if (!this.canManage() || row.isOwner) {
      return;
    }
    this.removeTarget.set(row);
  }

  protected cancelRemove(): void {
    if (this.removing()) {
      return;
    }
    this.removeTarget.set(null);
  }

  protected async confirmRemove(): Promise<void> {
    const target = this.removeTarget();
    if (!target || this.removing()) {
      return;
    }
    this.removing.set(true);
    try {
      await firstValueFrom(this.membersService.removeMember(target.tenantMembershipId));
      this.removeTarget.set(null);
      this.closeDetail();
      this.directory.reload();
    } finally {
      this.removing.set(false);
    }
  }

  protected removeName(): string {
    const target = this.removeTarget();
    return target ? this.language.pick(target.arabicName, target.englishName) || target.email : '';
  }

  protected async openInvite(): Promise<void> {
    if (!this.canCreate()) {
      return;
    }
    this.inviteResult.set(null);
    this.grantScope.set(null);
    this.grantScopeLoading.set(true);
    this.inviteOpen.set(true);
    try {
      this.grantScope.set(await firstValueFrom(this.membersService.loadInviteGrantScope()));
    } finally {
      this.grantScopeLoading.set(false);
    }
  }

  protected closeInvite(): void {
    // Mid-flight requests keep the dialog up so the busy state stays visible.
    if (this.busy()) {
      return;
    }
    this.inviteOpen.set(false);
  }


  protected setEditRoleIds(roleIds: string[]): void {
    this.editModel.set({ roleIds });
    this.editForm.roleIds().markAsTouched();
  }

  protected async openEditRoles(member: MemberListItem): Promise<void> {
    if (!this.canManage() || !this.isActive(member)) {
      return;
    }
    this.editingMember.set(member);
    this.memberRoles.set(null);
    this.editModel.set({
      roleIds: member.roles.map((role) => role.roleId),
    });
    this.memberRolesLoading.set(true);
    try {
      const dto = await firstValueFrom(
        this.membersService.memberRoles(member.tenantMembershipId),
      );
      this.memberRoles.set(dto);
      this.setEditRoleIds(dto.roles.map((role) => role.id));
    } catch {
      this.memberRoles.set(null);
    } finally {
      this.memberRolesLoading.set(false);
    }
  }

  protected closeEditRoles(): void {
    if (this.savingRoles()) {
      return;
    }
    this.editingMember.set(null);
    this.memberRoles.set(null);
    this.editModel.set({ roleIds: [] });
  }

  protected isRoleSelected(roleId: string): boolean {
    return this.editModel().roleIds.includes(roleId);
  }

  protected isRoleLocked(role: RoleListItem): boolean {
    const member = this.editingMember();
    return (
      member !== null && member.isOwner && role.isOwnerRole && role.applicationKey === 'account'
    );
  }

  protected toggleEditRole(role: RoleListItem): void {
    if (this.isRoleLocked(role) || this.savingRoles()) {
      return;
    }
    const current = this.editModel().roleIds;
    this.setEditRoleIds(
      current.includes(role.id)
        ? current.filter((id) => id !== role.id)
        : [...current, role.id],
    );
  }

  protected saveRoles(event: Event): void {
    event.preventDefault();
    if (!this.canManage()) {
      return;
    }
    void submit(this.editForm, async () => {
      const member = this.editingMember();
      if (!member) {
        return;
      }

      this.savingRoles.set(true);
      try {
        await firstValueFrom(
          this.membersService.updateMemberRoles(
            member.tenantMembershipId,
            this.editModel().roleIds,
          ),
        );
        this.savingRoles.set(false);
        this.closeEditRoles();
        this.directory.reload();
      } catch {
        this.savingRoles.set(false);
      }
    });
  }

  protected initials(row: MemberListItem): string {
    return nameInitials(this.language.pick(row.arabicName, row.englishName), row.email);
  }

  protected statusLabel(status: string): string {
    return `members.status.${status.replace(/\s+/g, '')}`;
  }

  protected isKnownStatus(status: string): boolean {
    const normalized = status.replace(/\s+/g, '');
    return ['Active', 'Suspended', 'Removed'].includes(normalized);
  }

  protected statusClass(status: string): string {
    const normalized = status.replace(/\s+/g, '').toLowerCase();
    if (normalized === 'active') {
      return 'workspace-status-pill workspace-status-pill--active';
    }
    if (normalized === 'suspended' || normalized === 'removed') {
      return 'workspace-status-pill workspace-status-pill--suspended';
    }
    if (normalized === 'pendingactivation' || normalized === 'pending') {
      return 'workspace-status-pill workspace-status-pill--pending';
    }
    return 'workspace-status-pill';
  }

  protected inviteResultMessage(result: AddMemberResult): string {
    if (result.isNewUser) {
      return 'members.invite.resultNewUser';
    }
    return result.requiresPasswordSetup
      ? 'members.invite.resultExistingSetup'
      : 'members.invite.resultExistingReady';
  }

  protected async onInvite(value: AddMemberFormValue): Promise<void> {
    if (!this.canCreate() || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.inviteResult.set(null);
    try {
      const result = await firstValueFrom(
        this.membersService.inviteMember(value, this.inviteCatalog()),
      );
      this.inviteResult.set(result);
      this.busy.set(false);
      // Close on success only. A failure leaves the dialog open with the
      // typed values intact, so nobody has to re-enter the form to retry.
      this.inviteOpen.set(false);
      this.directory.reload();
    } catch {
      this.busy.set(false);
    }
  }
}
