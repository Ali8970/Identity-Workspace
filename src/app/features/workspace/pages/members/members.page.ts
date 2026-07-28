import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  AddMemberResult,
  MemberListItem,
  RoleListItem,
} from '../../models/workspace-feature.model';
import { MembersService } from '../../services/members.service';

@Component({
  selector: 'app-members-page',
  imports: [TranslatePipe, FormField],
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
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
                    <div class="auth-field__control auth-field__control--plain">
                      <input
                        id="member-ar"
                        class="auth-field__input auth-field__input--plain"
                        type="text"
                        dir="rtl"
                        lang="ar"
                        [placeholder]="'members.nameArPlaceholder' | translate"
                        [formField]="addForm.arabicName"
                      />
                    </div>
                  </div>

                  <div class="auth-field">
                    <label class="auth-field__label" for="member-en">
                      {{ 'members.nameEn' | translate }}
                    </label>
                    <div class="auth-field__control auth-field__control--plain">
                      <input
                        id="member-en"
                        class="auth-field__input auth-field__input--plain"
                        type="text"
                        [placeholder]="'members.nameEnPlaceholder' | translate"
                        [formField]="addForm.englishName"
                      />
                    </div>
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
                              {{ label(row.nameAr, row.nameEn) }}
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
                            @for (role of row.roles; track role.id) {
                              <span class="workspace-role-pill">
                                {{ label(role.nameAr, role.nameEn) }}
                              </span>
                            }
                          }
                        </div>
                      </td>
                      <td>
                        @if (isKnownStatus(row.status)) {
                          <span [class]="statusClass(row.status)">
                            {{ statusLabel(row.status) | translate }}
                          </span>
                        } @else {
                          <span class="workspace-status-pill">{{ row.status }}</span>
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
  `,
})
export class MembersPage {
  private readonly membersService = inject(MembersService);
  private readonly language = inject(LanguageService);

  protected readonly members = signal<MemberListItem[]>([]);
  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly inviteResult = signal<AddMemberResult | null>(null);
  protected readonly model = signal({ email: '', arabicName: '', englishName: '' });
  protected readonly addForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
    required(schema.arabicName);
    required(schema.englishName);
  });

  protected readonly canCreate = computed(() => this.membersService.canCreateMembers());

  constructor() {
    void this.load();
  }

  protected label(ar: string, en: string): string {
    return this.language.current() === 'ar' ? ar || en : en || ar;
  }

  protected initials(row: MemberListItem): string {
    const name = this.label(row.nameAr, row.nameEn).trim();
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
    return ['Active', 'Suspended', 'Removed', 'PendingActivation'].includes(normalized);
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
      const { members, roles } = await firstValueFrom(this.membersService.loadMembersAndRoles());
      this.members.set(members);
      this.roles.set(roles);
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
        const value = this.model();
        const identityRole = this.membersService.findIdentityRole(this.roles());
        const result = await firstValueFrom(
          this.membersService.inviteMember(value, identityRole?.id ?? null),
        );
        this.inviteResult.set(result);
        this.model.set({ email: '', arabicName: '', englishName: '' });
        await this.load();
      } finally {
        this.busy.set(false);
      }
    });
  }
}
