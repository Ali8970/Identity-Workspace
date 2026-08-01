import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, email, form, minLength, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MultiSelect, MultiSelectOption } from '../../../../shared/ui/multi-select/multi-select';
import {
  AddMemberResult,
  MemberListItem,
  RoleListItem,
} from '../../models/workspace-feature.model';
import { FlatTeamOption, MembersService } from '../../services/members.service';

@Component({
  selector: 'app-members-page',
  imports: [TranslatePipe, FormField, MultiSelect],
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
        </div>
      </header>

      @if (loading()) {
        <div class="workspace-loading" role="status" aria-live="polite">
          <span class="workspace-loading__spinner" aria-hidden="true"></span>
          <span>{{ 'members.loading' | translate }}</span>
        </div>
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
              {{
                result.requiresPasswordSetup
                  ? ('members.invitedSetPassword' | translate)
                  : ('members.invitedExisting' | translate)
              }}
            </span>
          </div>
        }

        @if (canCreate()) {
          <section class="workspace-panel" aria-labelledby="members-invite-heading">
            <header class="workspace-panel__head">
              <h2 class="workspace-panel__title" id="members-invite-heading">
                {{ 'members.add' | translate }}
              </h2>
              <p class="workspace-panel__lead">{{ 'members.inviteHint' | translate }}</p>
            </header>

            <div class="workspace-panel__body">
              <form class="workspace-form" (submit)="onAdd($event)" novalidate>
                <div class="auth-field">
                  <label class="auth-field__label" for="member-email">
                    {{ 'members.email' | translate }}
                  </label>
                  <div class="auth-field__control">
                    <span class="auth-field__icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <path d="M4 6h16v12H4z" />
                        <path d="m4 7 8 6 8-6" />
                      </svg>
                    </span>
                    <input
                      id="member-email"
                      class="auth-field__input"
                      type="email"
                      autocomplete="email"
                      inputmode="email"
                      [placeholder]="'members.emailPlaceholder' | translate"
                      [formField]="addForm.email"
                    />
                  </div>
                </div>

                <div class="workspace-form__row">
                  <div class="auth-field">
                    <label class="auth-field__label" for="member-ar">
                      {{ 'members.nameAr' | translate }}
                    </label>
                    <div class="auth-field__control">
                      <span class="auth-field__icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                        >
                          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                          <path d="M4 20a8 8 0 0 1 16 0" />
                        </svg>
                      </span>
                      <input
                        id="member-ar"
                        class="auth-field__input"
                        type="text"
                        [attr.dir]="uiDir()"
                        [attr.lang]="language.current()"
                        [placeholder]="'members.nameArPlaceholder' | translate"
                        [formField]="addForm.arabicName"
                      />
                    </div>
                  </div>

                  <div class="auth-field">
                    <label class="auth-field__label" for="member-en">
                      {{ 'members.nameEn' | translate }}
                    </label>
                    <div class="auth-field__control">
                      <span class="auth-field__icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                        >
                          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                          <path d="M4 20a8 8 0 0 1 16 0" />
                        </svg>
                      </span>
                      <input
                        id="member-en"
                        class="auth-field__input"
                        type="text"
                        [attr.dir]="uiDir()"
                        [attr.lang]="language.current()"
                        [placeholder]="'members.nameEnPlaceholder' | translate"
                        [formField]="addForm.englishName"
                      />
                    </div>
                  </div>
                </div>

                <div class="workspace-form__row">
                  <div class="auth-field">
                    <label class="auth-field__label" id="member-roles-label">
                      {{ 'members.roles' | translate }}
                      <span class="auth-field__required" aria-hidden="true">*</span>
                    </label>
                    <app-multi-select
                      [options]="roleSelectOptions()"
                      [value]="model().roleIds"
                      (valueChange)="setRoleIds($event)"
                      [labelledBy]="'member-roles-label'"
                      [placeholder]="'members.rolesPlaceholder' | translate"
                      [emptyMessage]="'members.rolesEmpty' | translate"
                    />
                    @if (addForm.roleIds().touched() && addForm.roleIds().invalid()) {
                      <p class="auth-field__error" id="member-roles-error" role="alert">
                        {{ 'members.rolesRequired' | translate }}
                      </p>
                    } @else {
                      <p class="workspace-field-hint" id="member-roles-hint">
                        {{ 'members.rolesHint' | translate }}
                      </p>
                    }
                  </div>

                  <div class="auth-field">
                    <label class="auth-field__label" id="member-teams-label">
                      {{ 'members.teams' | translate }}
                    </label>
                    <app-multi-select
                      [options]="teamSelectOptions()"
                      [value]="model().teamIds"
                      (valueChange)="setTeamIds($event)"
                      [labelledBy]="'member-teams-label'"
                      [placeholder]="'members.teamsPlaceholder' | translate"
                      [emptyMessage]="'members.teamsEmpty' | translate"
                    />
                    <p class="workspace-field-hint" id="member-teams-hint">
                      {{ 'members.teamsHint' | translate }}
                    </p>
                  </div>
                </div>

                <div class="workspace-form__actions">
                  <button
                    class="ui-btn ui-btn--primary"
                    type="submit"
                    [disabled]="busy() || addForm().invalid()"
                    [attr.aria-busy]="busy()"
                  >
                    {{ 'members.submit' | translate }}
                  </button>
                </div>
              </form>
            </div>
          </section>
        }

        <section class="workspace-data-card" aria-labelledby="members-list-heading">
          <header class="workspace-data-card__head">
            <h2 class="workspace-data-card__title" id="members-list-heading">
              {{ 'members.listTitle' | translate }}
            </h2>
          </header>

          @if (members().length === 0) {
            <div class="workspace-table-empty" role="status">
              {{ 'members.empty' | translate }}
            </div>
          } @else {
            <div class="workspace-table-wrap">
              <table class="workspace-table">
                <thead>
                  <tr>
                    <th scope="col">{{ 'members.colName' | translate }}</th>
                    <th scope="col">{{ 'members.email' | translate }}</th>
                    <th scope="col">{{ 'members.colRoles' | translate }}</th>
                    <th scope="col">{{ 'members.colStatus' | translate }}</th>
                    @if (canManage()) {
                      <th scope="col">{{ 'members.colActions' | translate }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of members(); track row.tenantMembershipId) {
                    <tr>
                      <td>
                        <div class="workspace-member">
                          <span class="workspace-member__avatar" aria-hidden="true">
                            {{ initials(row) }}
                          </span>
                          <span class="workspace-member__info">
                            <span class="workspace-member__name">
                              {{ label(row.arabicName, row.englishName) }}
                            </span>
                            @if (row.isOwner) {
                              <span class="workspace-member__owner">
                                {{ 'members.owner' | translate }}
                              </span>
                            }
                          </span>
                        </div>
                      </td>
                      <td>{{ row.email }}</td>
                      <td>
                        <div class="workspace-role-list">
                          @if (row.roles.length === 0) {
                            <span class="workspace-role-pill workspace-role-pill--empty">
                              {{ 'members.noRoles' | translate }}
                            </span>
                          } @else {
                            @for (role of row.roles; track role.roleId) {
                              <span class="workspace-role-pill">
                                {{ label(role.nameAr, role.nameEn) }}
                              </span>
                            }
                          }
                        </div>
                      </td>
                      <td>
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
                      @if (canManage()) {
                        <td>
                          <button
                            type="button"
                            class="ui-btn ui-btn--ghost workspace-table__action"
                            (click)="openEditRoles(row)"
                          >
                            {{ 'members.editRoles' | translate }}
                          </button>
                        </td>
                      }
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
        >
          <header class="workspace-dialog__head">
            <div>
              <h2 class="workspace-dialog__title" id="edit-member-roles-title">
                {{ 'members.editRolesTitle' | translate }}
              </h2>
              <p class="workspace-dialog__lead">
                {{
                  'members.editRolesLead'
                    | translate: { name: label(member.arabicName, member.englishName) }
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
              <div class="auth-field">
                <label class="auth-field__label" id="edit-member-roles-label">
                  {{ 'members.roles' | translate }}
                  <span class="auth-field__required" aria-hidden="true">*</span>
                </label>
                <app-multi-select
                  [options]="roleSelectOptions()"
                  [value]="editModel().roleIds"
                  (valueChange)="setEditRoleIds($event)"
                  [labelledBy]="'edit-member-roles-label'"
                  [placeholder]="'members.rolesPlaceholder' | translate"
                  [emptyMessage]="'members.rolesEmpty' | translate"
                  [disabled]="savingRoles()"
                />
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
  `,
})
export class MembersPage {
  private readonly membersService = inject(MembersService);
  protected readonly language = inject(LanguageService);

  /** Matches document dir from LanguageService — placeholders align with UI language. */
  protected readonly uiDir = computed(() => (this.language.current() === 'ar' ? 'rtl' : 'ltr'));

  protected readonly members = signal<MemberListItem[]>([]);
  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly teamOptions = signal<FlatTeamOption[]>([]);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly inviteResult = signal<AddMemberResult | null>(null);
  protected readonly editingMember = signal<MemberListItem | null>(null);
  protected readonly savingRoles = signal(false);
  protected readonly model = signal({
    email: '',
    arabicName: '',
    englishName: '',
    roleIds: [] as string[],
    teamIds: [] as string[],
  });
  protected readonly editModel = signal({ roleIds: [] as string[] });
  protected readonly addForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
    required(schema.arabicName);
    required(schema.englishName);
    minLength(schema.roleIds, 1);
  });
  protected readonly editForm = form(this.editModel, (schema) => {
    minLength(schema.roleIds, 1);
  });

  protected readonly canManage = computed(() => this.membersService.canCreateMembers());
  /** Invite panel uses the same memberships.manage permission. */
  protected readonly canCreate = this.canManage;

  protected readonly roleSelectOptions = computed<MultiSelectOption[]>(() =>
    this.roles().map((role) => ({
      value: role.id,
      label: this.label(role.nameAr, role.nameEn),
      meta: role.applicationKey,
    })),
  );

  protected readonly teamSelectOptions = computed<MultiSelectOption[]>(() =>
    this.teamOptions().map((team) => ({
      value: team.id,
      label: team.name,
      depth: team.depth,
    })),
  );

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected setRoleIds(roleIds: string[]): void {
    this.model.update((current) => ({ ...current, roleIds }));
    this.addForm.roleIds().markAsTouched();
  }

  protected setTeamIds(teamIds: string[]): void {
    this.model.update((current) => ({ ...current, teamIds }));
  }

  protected setEditRoleIds(roleIds: string[]): void {
    this.editModel.set({ roleIds });
    this.editForm.roleIds().markAsTouched();
  }

  protected openEditRoles(member: MemberListItem): void {
    if (!this.canManage()) {
      return;
    }
    this.editingMember.set(member);
    this.editModel.set({
      roleIds: member.roles.map((role) => role.roleId),
    });
  }

  protected closeEditRoles(): void {
    if (this.savingRoles()) {
      return;
    }
    this.editingMember.set(null);
    this.editModel.set({ roleIds: [] });
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
        await this.load();
      } catch {
        this.savingRoles.set(false);
      }
    });
  }

  protected initials(row: MemberListItem): string {
    const name = this.label(row.arabicName, row.englishName).trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return row.email.slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
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

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const { members, roles, teams } = await firstValueFrom(
        this.membersService.loadMembersRolesAndTeams(),
      );
      this.members.set(members);
      this.roles.set(roles);
      this.teamOptions.set(this.membersService.flattenTeams(teams));
    } finally {
      this.loading.set(false);
    }
  }

  protected onAdd(event: Event): void {
    event.preventDefault();
    void submit(this.addForm, async () => {
      this.busy.set(true);
      this.inviteResult.set(null);
      try {
        const result = await firstValueFrom(this.membersService.inviteMember(this.model()));
        this.inviteResult.set(result);
        this.model.set({
          email: '',
          arabicName: '',
          englishName: '',
          roleIds: [],
          teamIds: [],
        });
        await this.load();
      } finally {
        this.busy.set(false);
      }
    });
  }
}
