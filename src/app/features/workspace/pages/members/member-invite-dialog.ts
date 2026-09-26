import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationLabels } from '../../../../core/i18n/application-labels.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { applicationModifier } from '../../../../shared/ui/display';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import { AddMemberFormValue, RoleListItem } from '../../models/workspace-feature.model';
import { RoleGrantScope } from '../../services/roles.service';
import {
  InviteApplication,
  InviteTeamOption,
  MembersService,
} from '../../services/members.service';

interface FieldStatus {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { kind: string }[];
}

interface DeselectNotice {
  application: string;
  roles: number;
  teams: number;
}

const EMAIL_MAX = 256;
const NAME_MAX = 200;

function emptyInvite(): AddMemberFormValue {
  return {
    email: '',
    arabicName: '',
    englishName: '',
    applicationKeys: [],
    roleIds: [],
    teamIds: [],
  };
}

@Component({
  selector: 'app-member-invite-dialog',
  imports: [TranslatePipe, FormField, FocusTrap],
  template: `
    <div class="workspace-dialog workspace-dialog--fill" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        [attr.aria-label]="'members.inviteCancel' | translate"
        (click)="close()"
      ></button>
      <div
        class="workspace-dialog__panel workspace-team-details workspace-invite"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        aria-describedby="invite-lead"
        appFocusTrap
        (dismiss)="close()"
      >
        <header class="workspace-team-details__head">
          <span
            class="workspace-team-details__icon workspace-team-details__icon--application"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
              <path d="M19 8v6M16 11h6" />
            </svg>
          </span>
          <div class="workspace-team-details__heading">
            <h2 class="workspace-dialog__title" id="invite-title">
              {{ 'members.add' | translate }}
            </h2>
            <p class="workspace-dialog__lead" id="invite-lead">
              {{ 'members.invite.lead' | translate }}
            </p>
          </div>
          <button
            type="button"
            class="workspace-dialog__close"
            [attr.aria-label]="'members.inviteCancel' | translate"
            [disabled]="saving()"
            (click)="close()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <form class="workspace-invite__form" (submit)="onSubmit($event)" novalidate>
          <div class="workspace-team-details__body workspace-invite__body">
            <div class="workspace-invite__layout">
              <div class="workspace-invite__main">
                <section class="workspace-invite__section" aria-labelledby="invite-member-heading">
                  <header class="workspace-invite__section-head">
                    <span class="workspace-invite__step" aria-hidden="true">1</span>
                    <div>
                      <h3 class="workspace-team-details__section-title" id="invite-member-heading">
                        {{ 'members.invite.memberSection' | translate }}
                      </h3>
                      <p class="workspace-team-details__section-lead">
                        {{ 'members.invite.memberLead' | translate }}
                      </p>
                    </div>
                  </header>

                  <div class="mb-3.5 flex flex-col gap-1">
                    <label class="text-[12px] font-semibold text-text-muted" for="invite-email">
                      {{ 'members.email' | translate }}
                      <span class="text-danger" aria-hidden="true">*</span>
                    </label>
                    <div class="relative flex items-center">
                      <span class="pointer-events-none absolute start-3.5 grid size-[1.1rem] place-items-center text-text-muted" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M4 6h16v12H4z" />
                          <path d="m4 7 8 6 8-6" />
                        </svg>
                      </span>
                      <input
                        id="invite-email"
                        class="field-control ps-10"
                        [class.border-danger]="errors().email"
                        type="email"
                        dir="ltr"
                        autocomplete="email"
                        inputmode="email"
                        [placeholder]="'members.emailPlaceholder' | translate"
                        [attr.aria-invalid]="errors().email ? true : null"
                        [attr.aria-describedby]="errors().email ? 'invite-email-error' : null"
                        [formField]="inviteForm.email"
                      />
                    </div>
                    @if (errors().email; as message) {
                      <p class="m-0 text-[12px] text-danger" id="invite-email-error" role="alert">
                        {{ message | translate: { max: emailMax } }}
                      </p>
                    }
                  </div>

                  <div class="workspace-form__row workspace-invite__names">
                    <div class="mb-3.5 flex flex-col gap-1">
                      <label class="text-[12px] font-semibold text-text-muted" for="invite-name-ar">
                        {{ 'members.nameAr' | translate }}
                      </label>
                      <div class="relative flex items-center">
                        <span class="pointer-events-none absolute start-3.5 grid size-[1.1rem] place-items-center text-text-muted" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                            <path d="M4 20a8 8 0 0 1 16 0" />
                          </svg>
                        </span>
                        <input
                          id="invite-name-ar"
                          class="field-control ps-10"
                          [class.border-danger]="nameInvalid()"
                          type="text"
                          dir="rtl"
                          lang="ar"
                          autocomplete="off"
                          [placeholder]="'members.nameArPlaceholder' | translate"
                          [attr.aria-invalid]="nameInvalid() ? true : null"
                          [attr.aria-describedby]="nameDescribedBy()"
                          [formField]="inviteForm.arabicName"
                        />
                      </div>
                    </div>

                    <div class="mb-3.5 flex flex-col gap-1">
                      <label class="text-[12px] font-semibold text-text-muted" for="invite-name-en">
                        {{ 'members.nameEn' | translate }}
                      </label>
                      <div class="relative flex items-center">
                        <span class="pointer-events-none absolute start-3.5 grid size-[1.1rem] place-items-center text-text-muted" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                            <path d="M4 20a8 8 0 0 1 16 0" />
                          </svg>
                        </span>
                        <input
                          id="invite-name-en"
                          class="field-control ps-10"
                          [class.border-danger]="nameInvalid()"
                          type="text"
                          dir="ltr"
                          lang="en"
                          autocomplete="off"
                          [placeholder]="'members.nameEnPlaceholder' | translate"
                          [attr.aria-invalid]="nameInvalid() ? true : null"
                          [attr.aria-describedby]="nameDescribedBy()"
                          [formField]="inviteForm.englishName"
                        />
                      </div>
                    </div>
                  </div>
                  @if (nameError(); as message) {
                    <p class="m-0 text-[12px] text-danger" id="invite-name-error" role="alert">
                      {{ message | translate: { max: nameMax } }}
                    </p>
                  }
                  <p class="workspace-field-hint" id="invite-name-hint">
                    {{ 'members.invite.nameHint' | translate }}
                  </p>
                </section>

                <section class="workspace-invite__section" aria-labelledby="invite-apps-heading">
                  <header class="workspace-invite__section-head">
                    <span class="workspace-invite__step" aria-hidden="true">2</span>
                    <div>
                      <h3 class="workspace-team-details__section-title" id="invite-apps-heading">
                        {{ 'members.invite.appsSection' | translate }}
                        <span class="text-danger" aria-hidden="true">*</span>
                      </h3>
                      <p class="workspace-team-details__section-lead" id="invite-apps-lead">
                        {{ 'members.invite.appsLead' | translate }}
                      </p>
                    </div>
                  </header>

                  @if (applications().length === 0) {
                    <p class="workspace-team-details__empty workspace-dialog__empty" role="status">
                      {{ 'members.invite.appsEmpty' | translate }}
                    </p>
                  } @else {
                    <div
                      class="workspace-invite-apps"
                      role="group"
                      aria-labelledby="invite-apps-heading"
                      aria-describedby="invite-apps-lead"
                    >
                      @for (app of applications(); track app.key) {
                        <label
                          class="workspace-invite-app"
                          [class.workspace-invite-app--selected]="isApplicationSelected(app.key)"
                        >
                          <input
                            type="checkbox"
                            class="workspace-invite-app__check"
                            [checked]="isApplicationSelected(app.key)"
                            [disabled]="saving()"
                            [attr.aria-invalid]="errors().applications ? true : null"
                            [attr.aria-describedby]="
                              errors().applications
                                ? 'invite-apps-error invite-app-meta-' + app.key
                                : 'invite-app-meta-' + app.key
                            "
                            (change)="toggleApplication(app)"
                          />
                          <span
                            [class]="
                              'workspace-app-group__icon workspace-invite-app__icon workspace-app-group__icon--' +
                              modifier(app.key)
                            "
                            aria-hidden="true"
                          >
                            @switch (app.key) {
                              @case ('account') {
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
                                  <path d="M12 12v3M9 12h6" />
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
                          <span class="workspace-invite-app__body">
                            <span class="workspace-invite-app__name">
                              <bdi>{{ app.label }}</bdi>
                            </span>
                            <span class="workspace-invite-app__meta" [id]="'invite-app-meta-' + app.key">
                              {{
                                'members.invite.appMeta'
                                  | translate: { roles: app.roles.length, teams: app.teams.length }
                              }}
                            </span>
                          </span>
                          @if (isApplicationSelected(app.key)) {
                            <span class="workspace-invite-app__state">
                              {{ 'members.invite.appSelected' | translate }}
                            </span>
                          }
                        </label>
                      }
                    </div>
                  }

                  @if (errors().applications; as message) {
                    <p class="m-0 text-[12px] text-danger" id="invite-apps-error" role="alert">
                      {{ message | translate }}
                    </p>
                  }
                  <p class="workspace-invite__notice" role="status" aria-live="polite">
                    @if (deselectNotice(); as notice) {
                      {{ 'members.invite.deselected' | translate: notice }}
                    }
                  </p>
                </section>

                <section class="workspace-invite__section" aria-labelledby="invite-access-heading">
                  <header class="workspace-invite__section-head">
                    <span class="workspace-invite__step" aria-hidden="true">3</span>
                    <div>
                      <h3 class="workspace-team-details__section-title" id="invite-access-heading">
                        {{ 'members.invite.accessSection' | translate }}
                      </h3>
                      <p class="workspace-team-details__section-lead">
                        {{ 'members.invite.accessLead' | translate }}
                      </p>
                    </div>
                  </header>

                  @if (grantScopeLoading()) {
                    <div class="workspace-loading workspace-loading--compact" role="status" aria-live="polite">
                      <span class="workspace-loading__spinner" aria-hidden="true"></span>
                      <span>{{ 'members.invite.checkingAccess' | translate }}</span>
                    </div>
                  } @else if (selectedApplications().length === 0) {
                    <p class="workspace-team-details__empty workspace-dialog__empty">
                      {{ 'members.invite.accessEmpty' | translate }}
                    </p>
                  } @else {
                    @for (app of selectedApplications(); track app.key) {
                      <section
                        class="workspace-invite-access"
                        [attr.aria-labelledby]="'invite-access-' + app.key"
                      >
                        <header class="workspace-invite-access__head">
                          <h4 class="workspace-app-group__title" [id]="'invite-access-' + app.key">
                            <span
                              [class]="'workspace-app-group__icon workspace-app-group__icon--' + modifier(app.key)"
                              aria-hidden="true"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                              </svg>
                            </span>
                            <bdi>{{ app.label }}</bdi>
                          </h4>
                          <span class="workspace-chip workspace-chip--muted">
                            {{
                              'members.invite.appCounts'
                                | translate
                                  : { roles: selectedRoleCount(app), teams: selectedTeamCount(app) }
                            }}
                          </span>
                        </header>

                        <div class="workspace-invite-access__grid">
                          <div
                            class="workspace-invite-access__column"
                            role="group"
                            [attr.aria-labelledby]="'invite-roles-' + app.key"
                          >
                            <p class="workspace-invite-access__label" [id]="'invite-roles-' + app.key">
                              {{ 'members.roles' | translate }}
                            </p>
                            @for (role of app.roles; track role.id) {
                              <label class="workspace-role-choice workspace-invite-choice">
                                <input
                                  type="checkbox"
                                  [checked]="isRoleSelected(role.id)"
                                  [disabled]="saving() || !canGrant(role)"
                                  [attr.aria-invalid]="errors().roles ? true : null"
                                  [attr.aria-describedby]="
                                    errors().roles
                                      ? 'invite-roles-error invite-role-meta-' + role.id
                                      : 'invite-role-meta-' + role.id
                                  "
                                  (change)="toggleRole(role)"
                                />
                                <span class="workspace-role-choice__body">
                                  <span class="workspace-invite-choice__name">
                                    <span class="workspace-role-choice__name">{{ roleName(role) }}</span>
                                    @if (role.isOwnerRole) {
                                      <span class="workspace-invite-badge workspace-invite-badge--owner">
                                        {{ 'roles.ownerRole' | translate }}
                                      </span>
                                    } @else if (role.isSystem) {
                                      <span class="workspace-invite-badge">
                                        {{ 'roles.systemRole' | translate }}
                                      </span>
                                    }
                                  </span>
                                  <span class="workspace-role-choice__meta" [id]="'invite-role-meta-' + role.id">
                                    <code dir="ltr">{{ role.code }}</code>
                                    @if (!canGrant(role)) {
                                      · {{ 'members.invite.roleNotGrantable' | translate }}
                                    }
                                  </span>
                                </span>
                              </label>
                            } @empty {
                              <p class="workspace-field-hint">
                                {{ 'members.invite.noRolesInApp' | translate: { app: app.label } }}
                              </p>
                            }

                            @for (role of selectedOwnerRoles(app); track role.id) {
                              <aside class="workspace-note workspace-invite__warning" role="note">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                  <path d="M12 3 2 20h20L12 3Z" />
                                  <path d="M12 10v4M12 17h.01" />
                                </svg>
                                <span>
                                  {{
                                    'members.invite.ownerWarning'
                                      | translate: { role: roleName(role), app: app.label }
                                  }}
                                </span>
                              </aside>
                            }
                          </div>

                          <div
                            class="workspace-invite-access__column"
                            role="group"
                            [attr.aria-labelledby]="'invite-teams-' + app.key"
                          >
                            <p class="workspace-invite-access__label" [id]="'invite-teams-' + app.key">
                              {{ 'members.teams' | translate }}
                              <span class="workspace-invite-access__optional">
                                {{ 'members.invite.optional' | translate }}
                              </span>
                            </p>
                            @for (team of app.teams; track team.id) {
                              <label
                                class="workspace-role-choice workspace-invite-choice"
                                [style.padding-inline-start.rem]="0.5 + team.depth * 1.1"
                              >
                                <input
                                  type="checkbox"
                                  [checked]="isTeamSelected(team.id)"
                                  [disabled]="saving()"
                                  [attr.aria-describedby]="team.trail.length > 0 ? 'invite-team-meta-' + team.id : null"
                                  (change)="toggleTeam(team)"
                                />
                                <span class="workspace-role-choice__body">
                                  <span class="workspace-invite-choice__name">
                                    <span class="workspace-role-choice__name">{{ team.name }}</span>
                                    @if (team.kind === 'Application') {
                                      <span class="workspace-invite-badge">
                                        {{ 'members.invite.applicationTeam' | translate }}
                                      </span>
                                    }
                                  </span>
                                  @if (team.trail.length > 0) {
                                    <span class="workspace-role-choice__meta" [id]="'invite-team-meta-' + team.id">
                                      <bdi>{{ teamTrail(team) }}</bdi>
                                    </span>
                                  }
                                </span>
                              </label>
                            } @empty {
                              <p class="workspace-field-hint">
                                {{ 'members.invite.noTeamsInApp' | translate: { app: app.label } }}
                              </p>
                            }
                          </div>
                        </div>
                      </section>
                    }
                  }

                  @if (errors().roles; as message) {
                    <p class="m-0 text-[12px] text-danger" id="invite-roles-error" role="alert">
                      {{ message | translate }}
                    </p>
                  } @else {
                    <p class="workspace-field-hint">{{ 'members.invite.accessHint' | translate }}</p>
                  }
                </section>
              </div>

              <aside class="workspace-invite__review" aria-labelledby="invite-review-heading">
                <header class="workspace-invite__section-head">
                  <span class="workspace-invite__step" aria-hidden="true">4</span>
                  <div>
                    <h3 class="workspace-team-details__section-title" id="invite-review-heading">
                      {{ 'members.invite.reviewSection' | translate }}
                    </h3>
                    <p class="workspace-team-details__section-lead">
                      {{ 'members.invite.reviewLead' | translate }}
                    </p>
                  </div>
                </header>

                <dl class="workspace-invite-review__facts">
                  <div>
                    <dt>{{ 'members.email' | translate }}</dt>
                    <dd>
                      @if (reviewEmail()) {
                        <bdi class="ltr-text">{{ reviewEmail() }}</bdi>
                      } @else {
                        <span class="workspace-invite-review__missing">
                          {{ 'members.invite.notEntered' | translate }}
                        </span>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>{{ 'members.invite.name' | translate }}</dt>
                    <dd>
                      @if (reviewNames().length > 0) {
                        @for (name of reviewNames(); track name.lang) {
                          <span class="workspace-invite-review__name" [attr.lang]="name.lang" [attr.dir]="name.dir">
                            {{ name.value }}
                          </span>
                        }
                      } @else {
                        <span class="workspace-invite-review__missing">
                          {{ 'members.invite.notEntered' | translate }}
                        </span>
                      }
                    </dd>
                  </div>
                </dl>

                <div class="workspace-invite-review__access">
                  @for (app of selectedApplications(); track app.key) {
                    <section class="workspace-invite-review__app" [attr.aria-label]="app.label">
                      <p class="workspace-invite-review__app-name"><bdi>{{ app.label }}</bdi></p>
                      <p class="workspace-invite-review__label">{{ 'members.roles' | translate }}</p>
                      <ul class="workspace-invite-review__list">
                        @for (role of selectedRolesOf(app); track role.id) {
                          <li
                            class="workspace-role-pill"
                            [class.workspace-invite-review__owner]="role.isOwnerRole"
                          >
                            {{ roleName(role) }}
                            @if (role.isOwnerRole) {
                              <span class="visually-hidden">({{ 'roles.ownerRole' | translate }})</span>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <path d="M12 3 2 20h20L12 3Z" />
                                <path d="M12 10v4M12 17h.01" />
                              </svg>
                            }
                          </li>
                        } @empty {
                          <li class="workspace-role-pill workspace-role-pill--empty">
                            {{ 'members.noRoles' | translate }}
                          </li>
                        }
                      </ul>
                      <p class="workspace-invite-review__label">{{ 'members.teams' | translate }}</p>
                      <ul class="workspace-invite-review__list">
                        @for (team of selectedTeamsOf(app); track team.id) {
                          <li class="workspace-role-pill workspace-invite-review__team">
                            <bdi>{{ teamPath(team) }}</bdi>
                          </li>
                        } @empty {
                          <li class="workspace-role-pill workspace-role-pill--empty">
                            {{ 'members.noTeams' | translate }}
                          </li>
                        }
                      </ul>
                    </section>
                  } @empty {
                    <p class="workspace-invite-review__missing">
                      {{ 'members.invite.reviewEmpty' | translate }}
                    </p>
                  }
                </div>

                @if (ownerRoleCount() > 0) {
                  <aside class="workspace-note workspace-invite__warning" role="note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path d="M12 3 2 20h20L12 3Z" />
                      <path d="M12 10v4M12 17h.01" />
                    </svg>
                    <span>{{ 'members.invite.reviewOwner' | translate: { count: ownerRoleCount() } }}</span>
                  </aside>
                }

                <aside class="workspace-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                  <span>{{ 'members.invite.emailNote' | translate }}</span>
                </aside>
              </aside>
            </div>
          </div>

          <footer class="workspace-invite__footer">
            <span class="workspace-invite__summary" aria-live="polite">
              {{
                'members.invite.summary'
                  | translate
                    : {
                        apps: selectedApplications().length,
                        roles: requestRoleCount(),
                        teams: requestTeamCount(),
                      }
              }}
            </span>
            <div class="workspace-actions">
              <button type="button" class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50" [disabled]="saving()" (click)="close()">
                {{ 'members.inviteCancel' | translate }}
              </button>
              <button
                type="submit"
                class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="saving() || grantScopeLoading()"
                [attr.aria-busy]="saving()"
              >
                @if (saving()) {
                  {{ 'members.submitting' | translate }}
                } @else {
                  {{ 'members.submit' | translate }}
                }
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  `,
})
export class MemberInviteDialog {
  private readonly membersService = inject(MembersService);
  private readonly applicationLabels = inject(ApplicationLabels);
  private readonly language = inject(LanguageService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly catalog = input<InviteApplication[]>([]);
  readonly grantScope = input<RoleGrantScope | null>(null);
  readonly grantScopeLoading = input(false);
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly submitted = output<AddMemberFormValue>();

  protected readonly emailMax = EMAIL_MAX;
  protected readonly nameMax = NAME_MAX;
  protected readonly modifier = applicationModifier;

  protected readonly model = signal<AddMemberFormValue>(emptyInvite());
  protected readonly deselectNotice = signal<DeselectNotice | null>(null);

  protected readonly inviteForm = form(this.model, (schema) => {
    required(schema.email);
    email(schema.email);
    maxLength(schema.email, EMAIL_MAX);
    maxLength(schema.arabicName, NAME_MAX);
    maxLength(schema.englishName, NAME_MAX);
    validate(schema.arabicName, ({ value, valueOf }) =>
      value().trim() || valueOf(schema.englishName).trim() ? undefined : { kind: 'nameRequired' },
    );
    validate(schema.englishName, ({ value, valueOf }) =>
      value().trim() || valueOf(schema.arabicName).trim() ? undefined : { kind: 'nameRequired' },
    );
    minLength(schema.applicationKeys, 1);
    minLength(schema.roleIds, 1);
  });

  protected readonly applications = computed(() =>
    this.catalog()
      .map((application) => ({ ...application, label: this.appLabel(application.key) }))
      .sort(
        (a, b) =>
          Number(b.key === 'account') - Number(a.key === 'account') ||
          a.label.localeCompare(b.label),
      ),
  );

  protected readonly selectedApplications = computed(() => {
    const keys = new Set(this.model().applicationKeys);
    return this.applications().filter((application) => keys.has(application.key));
  });

  protected readonly errors = computed(() => ({
    email: this.message(this.inviteForm.email(), {
      required: 'members.invite.emailRequired',
      email: 'members.invite.emailInvalid',
      maxLength: 'members.invite.tooLong',
    }),
    applications: this.message(this.inviteForm.applicationKeys(), {
      minLength: 'members.invite.appsRequired',
    }),
    roles: this.message(this.inviteForm.roleIds(), {
      minLength: 'members.rolesRequired',
    }),
  }));

  protected readonly nameError = computed(() => {
    const arabic = this.inviteForm.arabicName();
    const english = this.inviteForm.englishName();
    const tooLong = [...arabic.errors(), ...english.errors()].some(
      (error) => error.kind === 'maxLength',
    );
    if (tooLong && (arabic.touched() || english.touched())) {
      return 'members.invite.tooLong';
    }
    if (arabic.touched() && english.touched() && (arabic.invalid() || english.invalid())) {
      return 'members.invite.nameRequired';
    }
    return null;
  });

  protected readonly nameInvalid = computed(() => this.nameError() !== null);

  protected readonly nameDescribedBy = computed(() =>
    this.nameInvalid() ? 'invite-name-error invite-name-hint' : 'invite-name-hint',
  );

  protected readonly requestRoleCount = computed(
    () => this.selectedApplications().flatMap((app) => this.selectedRolesOf(app)).length,
  );

  protected readonly requestTeamCount = computed(
    () => this.selectedApplications().flatMap((app) => this.selectedTeamsOf(app)).length,
  );

  protected readonly ownerRoleCount = computed(
    () =>
      this.selectedApplications()
        .flatMap((app) => this.selectedRolesOf(app))
        .filter((role) => role.isOwnerRole).length,
  );

  protected readonly reviewEmail = computed(() => this.model().email.trim());

  protected readonly reviewNames = computed(() => {
    const value = this.model();
    const names: { lang: string; dir: string; value: string }[] = [];
    if (value.arabicName.trim()) {
      names.push({ lang: 'ar', dir: 'rtl', value: value.arabicName.trim() });
    }
    if (value.englishName.trim()) {
      names.push({ lang: 'en', dir: 'ltr', value: value.englishName.trim() });
    }
    return names;
  });

  protected isApplicationSelected(key: string): boolean {
    return this.model().applicationKeys.includes(key);
  }

  protected isRoleSelected(roleId: string): boolean {
    return this.model().roleIds.includes(roleId);
  }

  protected isTeamSelected(teamId: string): boolean {
    return this.model().teamIds.includes(teamId);
  }

  protected canGrant(role: RoleListItem): boolean {
    return this.membersService.canGrantRole(this.grantScope(), role);
  }

  protected selectedRolesOf(app: InviteApplication): RoleListItem[] {
    const selected = new Set(this.model().roleIds);
    return app.roles.filter((role) => selected.has(role.id));
  }

  protected selectedTeamsOf(app: InviteApplication): InviteTeamOption[] {
    const selected = new Set(this.model().teamIds);
    return app.teams.filter((team) => selected.has(team.id));
  }

  protected selectedOwnerRoles(app: InviteApplication): RoleListItem[] {
    return this.selectedRolesOf(app).filter((role) => role.isOwnerRole);
  }

  protected selectedRoleCount(app: InviteApplication): number {
    return this.selectedRolesOf(app).length;
  }

  protected selectedTeamCount(app: InviteApplication): number {
    return this.selectedTeamsOf(app).length;
  }

  protected roleName(role: RoleListItem): string {
    return this.language.pick(role.nameAr, role.nameEn) || role.code;
  }

  protected teamTrail(team: InviteTeamOption): string {
    return team.trail.join(' / ');
  }

  protected teamPath(team: InviteTeamOption): string {
    return [...team.trail, team.name].join(' / ');
  }

  protected toggleApplication(app: InviteApplication & { label: string }): void {
    if (this.saving()) {
      return;
    }
    const current = this.model();
    if (current.applicationKeys.includes(app.key)) {
      const roleIds = new Set(app.roles.map((role) => role.id));
      const teamIds = new Set(app.teams.map((team) => team.id));
      const keptRoles = current.roleIds.filter((id) => !roleIds.has(id));
      const keptTeams = current.teamIds.filter((id) => !teamIds.has(id));
      const removedRoles = current.roleIds.length - keptRoles.length;
      const removedTeams = current.teamIds.length - keptTeams.length;
      this.model.set({
        ...current,
        applicationKeys: current.applicationKeys.filter((key) => key !== app.key),
        roleIds: keptRoles,
        teamIds: keptTeams,
      });
      this.deselectNotice.set(
        removedRoles + removedTeams > 0
          ? { application: app.label, roles: removedRoles, teams: removedTeams }
          : null,
      );
    } else {
      this.model.set({ ...current, applicationKeys: [...current.applicationKeys, app.key] });
      this.deselectNotice.set(null);
    }
    this.inviteForm.applicationKeys().markAsTouched();
  }

  protected toggleRole(role: RoleListItem): void {
    if (this.saving() || !this.canGrant(role)) {
      return;
    }
    this.model.update((current) => ({
      ...current,
      roleIds: current.roleIds.includes(role.id)
        ? current.roleIds.filter((id) => id !== role.id)
        : [...current.roleIds, role.id],
    }));
    this.inviteForm.roleIds().markAsTouched();
  }

  protected toggleTeam(team: InviteTeamOption): void {
    if (this.saving()) {
      return;
    }
    this.model.update((current) => ({
      ...current,
      teamIds: current.teamIds.includes(team.id)
        ? current.teamIds.filter((id) => id !== team.id)
        : [...current.teamIds, team.id],
    }));
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || this.grantScopeLoading()) {
      return;
    }
    await submit(this.inviteForm, async () => {
      this.submitted.emit(this.model());
    });
    if (this.inviteForm().invalid()) {
      afterNextRender(
        () =>
          this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
    }
  }

  private appLabel(key: string): string {
    return (
      this.applicationLabels.label(key) || this.language.labelOr(`roles.apps.${key}`, key)
    );
  }

  private message(field: FieldStatus, messages: Record<string, string>): string | null {
    if (!field.touched() || !field.invalid()) {
      return null;
    }
    for (const error of field.errors()) {
      const key = messages[error.kind];
      if (key) {
        return key;
      }
    }
    return null;
  }
}
