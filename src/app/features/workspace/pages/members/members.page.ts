import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { form, minLength, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TenantMembershipStatus } from '../../../../enums/domain.enums';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { nameInitials } from '../../../../shared/ui/display';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
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
  ],
  template: `
    <div class="workspace-page">
      <header class="workspace-page__head">
        <div class="workspace-page__intro">
          <p class="workspace-page__eyebrow">{{ 'members.eyebrow' | translate }}</p>
          <h1 class="workspace-page__title" id="main-content-header" tabindex="-1">
            {{ 'members.title' | translate }}
          </h1>
          <p class="workspace-page__lead">{{ 'members.subtitle' | translate }}</p>
        </div>

        <div class="workspace-page__meta">
          <span class="workspace-chip workspace-chip--muted">
            {{ 'members.memberCount' | translate: { count: members().length } }}
          </span>
          @if (canCreate()) {
            <button type="button" class="ui-btn ui-btn--primary" (click)="openInvite()">
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
              {{ 'members.add' | translate }}
            </button>
          }
        </div>
      </header>

      @if (loading()) {
        <app-members-skeleton [label]="'members.loading' | translate" />
      } @else if (loadFailed()) {
        <section class="workspace-empty" role="status">
          <p class="workspace-empty__body">{{ 'common.loadFailed' | translate }}</p>
          <button type="button" class="ui-btn ui-btn--ghost" (click)="reload()">
            {{ 'common.retry' | translate }}
          </button>
        </section>
      } @else {
        @if (inviteResult(); as result) {
          <div class="workspace-status workspace-status--success" role="status">
            <span class="workspace-status__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="m9 12 2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <span class="workspace-status__body">
              {{ inviteResultMessage(result) | translate: { email: result.email } }}
            </span>
            @if (invitedMember(); as invited) {
              <button
                type="button"
                class="ui-btn ui-btn--ghost workspace-table__action"
                (click)="openDetail(invited)"
              >
                {{ 'members.invite.viewMember' | translate }}
              </button>
            }
          </div>
        }

        @if (resendResult(); as resent) {
          <div class="workspace-status workspace-status--success" role="status">
            <span class="workspace-status__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M4 6h16v12H4z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <span class="workspace-status__body">
              {{
                (resent.reusedExistingToken
                  ? 'members.resendReused'
                  : 'members.resendNew'
                ) | translate: { email: resent.email }
              }}
            </span>
          </div>
        }

        <section class="workspace-data-card" aria-labelledby="members-list-heading">
          <header class="workspace-data-card__head">
            <h2 class="workspace-data-card__title" id="members-list-heading">
              {{ 'members.listTitle' | translate }}
            </h2>
            <span class="workspace-data-card__count">
              {{
                'members.showing'
                  | translate: { shown: visibleMembers().length, total: members().length }
              }}
            </span>
          </header>

          @if (members().length > 0) {
            <!-- Filtering is a computed() over the already-loaded list, so none of
                 this touches the network. -->
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
                  [placeholder]="'members.search' | translate"
                  [attr.aria-label]="'members.search' | translate"
                />
              </div>

              <select
                class="workspace-facet"
                [value]="roleFilter()"
                (change)="roleFilter.set($any($event.target).value)"
                [attr.aria-label]="'members.filterRoleLabel' | translate"
              >
                <option value="">{{ 'members.filterAllRoles' | translate }}</option>
                @for (role of roles(); track role.id) {
                  <option [value]="role.id">{{ language.pick(role.nameAr, role.nameEn) }}</option>
                }
              </select>

              <select
                class="workspace-facet"
                [value]="statusFilter()"
                (change)="statusFilter.set($any($event.target).value)"
                [attr.aria-label]="'members.filterStatusLabel' | translate"
              >
                <option value="">{{ 'members.filterAllStatuses' | translate }}</option>
                @for (status of statusOptions; track status) {
                  <option [value]="status">{{ statusLabel(status) | translate }}</option>
                }
              </select>
            </div>
          }

          @if (members().length === 0) {
            <div class="workspace-table-empty" role="status">
              {{ 'members.empty' | translate }}
            </div>
          } @else if (visibleMembers().length === 0) {
            <!-- Distinct from the empty state above: nothing is missing, the filters
                 are just hiding it. Offering "invite someone" here would be wrong. -->
            <div class="workspace-empty workspace-empty--flush" role="status">
              <span class="workspace-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <p class="workspace-empty__title">{{ 'members.noResults' | translate }}</p>
              <p class="workspace-empty__body">
                {{ 'members.noResultsBody' | translate: { count: members().length } }}
              </p>
              <button type="button" class="ui-btn ui-btn--ghost" (click)="clearFilters()">
                {{ 'members.clearFilters' | translate }}
              </button>
            </div>
          } @else {
            <div class="workspace-table-wrap">
              <table class="workspace-table">
                <thead>
                  <tr>
                    <th scope="col">{{ 'members.colName' | translate }}</th>
                    <th scope="col">{{ 'members.colRoles' | translate }}</th>
                    <th scope="col">{{ 'members.colStatus' | translate }}</th>
                    <th scope="col" class="workspace-table__actions-col">
                      {{ 'members.colActions' | translate }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of visibleMembers(); track row.tenantMembershipId) {
                    <tr>
                      <td class="workspace-table__identity">
                        <div class="workspace-member">
                          <span class="workspace-member__avatar" aria-hidden="true">
                            {{ initials(row) }}
                          </span>
                          <span class="workspace-member__info">
                            <span class="workspace-member__name-row">
                              <span class="workspace-member__name">
                                {{ language.pick(row.arabicName, row.englishName) }}
                              </span>
                              @if (row.isOwner) {
                                <span class="workspace-member__owner">
                                  {{ 'members.owner' | translate }}
                                </span>
                              }
                              @if (isPending(row)) {
                                <span class="workspace-member__pending">
                                  {{ 'members.pendingActivation' | translate }}
                                </span>
                              }
                            </span>
                            <!-- Email belongs with the name, not in its own column: it is
                                 how you tell two people apart, not a fact you scan down. -->
                            <span class="workspace-member__email ltr-text">{{ row.email }}</span>
                          </span>
                        </div>
                      </td>
                      <td [attr.data-label]="'members.colRoles' | translate">
                        <div class="workspace-role-list">
                          @if (row.roles.length === 0) {
                            <span class="workspace-role-pill workspace-role-pill--empty">
                              {{ 'members.noRoles' | translate }}
                            </span>
                          } @else {
                            @for (role of row.roles; track role.roleId) {
                              <span class="workspace-role-pill">
                                {{ language.pick(role.nameAr, role.nameEn) }}
                              </span>
                            }
                          }
                        </div>
                      </td>
                      <td [attr.data-label]="'members.colStatus' | translate">
                        @if (isKnownStatus(row.tenantMembershipStatus)) {
                          <span [class]="statusClass(row.tenantMembershipStatus)">
                            {{ statusLabel(row.tenantMembershipStatus) | translate }}
                          </span>
                        } @else {
                          <span class="workspace-status-pill">{{
                            row.tenantMembershipStatus
                          }}</span>
                        }
                      </td>
                      <td class="workspace-table__actions-col">
                        <button
                          type="button"
                          class="ui-btn ui-btn--ghost workspace-table__action"
                          (click)="openDetail(row)"
                        >
                          {{ 'members.details' | translate }}
                        </button>
                        @if (canManage()) {
                          @if (isPending(row)) {
                            <button
                              type="button"
                              class="ui-btn ui-btn--ghost workspace-table__action"
                              [disabled]="resendingId() !== null"
                              [attr.aria-busy]="resendingId() === row.tenantMembershipId"
                              [attr.aria-label]="
                                'members.resendFor'
                                  | translate
                                    : { name: language.pick(row.arabicName, row.englishName) }
                              "
                              (click)="resend(row)"
                            >
                              @if (resendingId() === row.tenantMembershipId) {
                                {{ 'members.resending' | translate }}
                              } @else {
                                {{ 'members.resend' | translate }}
                              }
                            </button>
                          }
                          @if (isActive(row)) {
                            <button
                              type="button"
                              class="ui-btn ui-btn--ghost workspace-table__action"
                              [attr.aria-label]="
                                'members.editRolesFor'
                                  | translate
                                    : { name: language.pick(row.arabicName, row.englishName) }
                              "
                              (click)="openEditRoles(row)"
                            >
                              {{ 'members.editRoles' | translate }}
                            </button>
                          } @else {
                            <span
                              class="workspace-field-hint"
                              [id]="'member-roles-blocked-' + row.tenantMembershipId"
                            >
                              {{ 'members.editRolesBlockedInactive' | translate }}
                            </span>
                          }
                          @if (!row.isOwner) {
                            <button
                              type="button"
                              class="ui-btn ui-btn--ghost workspace-table__action"
                              [attr.aria-label]="
                                'members.removeFor'
                                  | translate
                                    : { name: language.pick(row.arabicName, row.englishName) }
                              "
                              (click)="askRemove(row)"
                            >
                              {{ 'members.remove' | translate }}
                            </button>
                          }
                        }
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

              <div class="auth-field">
                <span class="auth-field__label" id="edit-member-roles-label">
                  {{ 'members.roles' | translate }}
                  <span class="auth-field__required" aria-hidden="true">*</span>
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
                  <p class="auth-field__error" id="edit-member-roles-error" role="alert">
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
                  class="ui-btn ui-btn--ghost"
                  [disabled]="savingRoles()"
                  (click)="closeEditRoles()"
                >
                  {{ 'members.editRolesCancel' | translate }}
                </button>
                <button
                  type="submit"
                  class="ui-btn ui-btn--primary"
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
              <button type="button" class="ui-btn ui-btn--ghost" (click)="closeDetail()">
                {{ 'common.close' | translate }}
              </button>
              @if (canManage() && !member.isOwner) {
                <button type="button" class="ui-btn ui-btn--danger" (click)="askRemove(member)">
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
  protected readonly language = inject(LanguageService);

  protected readonly statusFilter = signal<TenantMembershipStatus | ''>('');

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

  /* Filters. Both are plain signals feeding one computed — the list is
     already in memory, so filtering never touches the network. */
  protected readonly search = signal('');
  protected readonly roleFilter = signal('');

  protected readonly statusOptions = MEMBER_STATUSES;

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
      // Match either name regardless of UI language — someone searching in
      // English should still find a member stored only with an Arabic name.
      return [row.email, row.arabicName, row.englishName].some((value) =>
        (value ?? '').toLowerCase().includes(term),
      );
    });
  });

  protected readonly hasFilters = computed(
    () => this.search().trim() !== '' || this.roleFilter() !== '' || this.statusFilter() !== '',
  );

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

  protected clearFilters(): void {
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
