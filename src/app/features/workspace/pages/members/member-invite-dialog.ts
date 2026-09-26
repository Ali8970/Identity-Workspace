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

type InviteStep = 'identity' | 'access' | 'review';

const EMAIL_MAX = 256;
const NAME_MAX = 200;

const STEPS: InviteStep[] = ['identity', 'access', 'review'];

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

/**
 * Invite wizard: Identity → Access → Review.
 * API requires ≥1 roleId, so access cannot be deferred.
 */
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

        <nav
          class="grid grid-cols-3 gap-1 border-b-[1.468px] border-border-subtle bg-surface-muted/50 px-4 py-3 max-w480:px-3"
          [attr.aria-label]="'members.invite.stepsLabel' | translate"
        >
          @for (item of stepItems; track item.id; let i = $index) {
            <div
              class="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
              [attr.aria-current]="step() === item.id ? 'step' : null"
            >
              @if (i < stepItems.length - 1) {
                <span
                  class="pointer-events-none absolute top-3 start-1/2 h-0.5 w-full"
                  [class.bg-info]="stepIndex() > i"
                  [class.bg-border-button]="stepIndex() <= i"
                  aria-hidden="true"
                ></span>
              }
              <span
                class="relative z-[1] grid size-7 place-items-center rounded-full text-[12px] font-bold"
                [class.bg-info]="step() === item.id || stepIndex() > i"
                [class.text-on-primary]="step() === item.id || stepIndex() > i"
                [class.shadow-[var(--shadow-primary-button)]]="step() === item.id"
                [class.bg-surface]="stepIndex() < i"
                [class.text-text-muted]="stepIndex() < i"
                [class.border-[1.468px]]="stepIndex() < i"
                [class.border-border-button]="stepIndex() < i"
                aria-hidden="true"
              >
                @if (stepIndex() > i) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-3.5">
                    <path d="m5 12 5 5L19 7" />
                  </svg>
                } @else {
                  {{ i + 1 }}
                }
              </span>
              <span
                class="relative z-[1] max-w-full truncate text-[11px] font-semibold"
                [class.text-info]="step() === item.id"
                [class.text-text]="stepIndex() > i"
                [class.text-text-muted]="stepIndex() < i"
              >
                {{ item.labelKey | translate }}
              </span>
            </div>
          }
        </nav>

        <form class="workspace-invite__form" (submit)="onSubmit($event)" novalidate>
          <div class="workspace-team-details__body workspace-invite__body">
            @switch (step()) {
              @case ('identity') {
                <section class="mx-auto w-full max-w-md" aria-labelledby="invite-member-heading">
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="invite-member-heading"
                    tabindex="-1"
                  >
                    {{ 'members.invite.memberSection' | translate }}
                  </h3>
                  <p class="m-0 mb-5 text-[13px] leading-normal text-text-muted">
                    {{ 'members.invite.memberLead' | translate }}
                  </p>

                  <div class="mb-4 flex flex-col gap-1.5">
                    <label
                      class="text-[12px] font-semibold text-text-muted"
                      for="invite-email"
                    >
                      {{ 'members.email' | translate }}
                      <span class="text-danger" aria-hidden="true">*</span>
                    </label>
                    <div class="relative flex items-center">
                      <span
                        class="pointer-events-none absolute start-3 grid size-4 place-items-center text-text-muted"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.75"
                          class="size-4"
                        >
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

                  <div class="mb-2 grid grid-cols-2 gap-3 max-w480:grid-cols-1">
                    <div class="flex flex-col gap-1.5">
                      <label
                        class="text-[12px] font-semibold text-text-muted"
                        for="invite-name-ar"
                      >
                        {{ 'members.nameAr' | translate }}
                      </label>
                      <input
                        id="invite-name-ar"
                        class="field-control"
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

                    <div class="flex flex-col gap-1.5">
                      <label
                        class="text-[12px] font-semibold text-text-muted"
                        for="invite-name-en"
                      >
                        {{ 'members.nameEn' | translate }}
                      </label>
                      <input
                        id="invite-name-en"
                        class="field-control"
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
                  @if (nameError(); as message) {
                    <p class="m-0 text-[12px] text-danger" id="invite-name-error" role="alert">
                      {{ message | translate: { max: nameMax } }}
                    </p>
                  } @else {
                    <p class="m-0 text-[12px] leading-normal text-text-muted" id="invite-name-hint">
                      {{ 'members.invite.nameHint' | translate }}
                    </p>
                  }
                </section>
              }

              @case ('access') {
                <section aria-labelledby="invite-access-heading">
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="invite-access-heading"
                    tabindex="-1"
                  >
                    {{ 'members.invite.accessSection' | translate }}
                  </h3>
                  <p class="m-0 mb-4 text-[13px] leading-normal text-text-muted" id="invite-apps-lead">
                    {{ 'members.invite.accessLead' | translate }}
                  </p>

                  <p
                    class="m-0 mb-2 text-[12px] font-semibold text-text-muted"
                    id="invite-apps-label"
                  >
                    {{ 'members.invite.appsSection' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </p>

                  @if (applications().length === 0) {
                    <p class="workspace-invite__empty" role="status">
                      {{ 'members.invite.appsEmpty' | translate }}
                    </p>
                  } @else {
                    <div
                      class="workspace-invite-apps"
                      role="group"
                      aria-labelledby="invite-apps-label"
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
                            (change)="toggleApplication(app)"
                          />
                          <span class="workspace-invite-app__body">
                            <span class="workspace-invite-app__name">
                              <bdi>{{ app.label }}</bdi>
                            </span>
                            <span class="workspace-invite-app__meta">
                              {{
                                'members.invite.appMeta'
                                  | translate: { roles: app.roles.length, teams: app.teams.length }
                              }}
                            </span>
                          </span>
                          @if (isApplicationSelected(app.key)) {
                            <span class="workspace-invite-app__tick" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="m5 12 5 5L19 7" />
                              </svg>
                            </span>
                          }
                        </label>
                      }
                    </div>
                  }

                  @if (errors().applications; as message) {
                    <p class="m-0 mt-2 text-[12px] text-danger" id="invite-apps-error" role="alert">
                      {{ message | translate }}
                    </p>
                  }
                  @if (deselectNotice(); as notice) {
                    <p class="workspace-invite__notice mt-2" role="status" aria-live="polite">
                      {{ 'members.invite.deselected' | translate: notice }}
                    </p>
                  }

                  <div class="workspace-invite-access-stack">
                    @if (grantScopeLoading()) {
                      <div
                        class="workspace-loading workspace-loading--compact"
                        role="status"
                        aria-live="polite"
                      >
                        <span class="workspace-loading__spinner" aria-hidden="true"></span>
                        <span>{{ 'members.invite.checkingAccess' | translate }}</span>
                      </div>
                    } @else if (selectedApplications().length === 0) {
                      <p class="workspace-invite__empty" role="status">
                        {{ 'members.invite.accessEmpty' | translate }}
                      </p>
                    } @else {
                      @for (app of selectedApplications(); track app.key) {
                        <section
                          class="workspace-invite-access"
                          [attr.aria-labelledby]="'invite-access-' + app.key"
                        >
                          <header class="workspace-invite-access__head">
                            <h4
                              class="workspace-invite-access__title"
                              [id]="'invite-access-' + app.key"
                            >
                              <bdi>{{ app.label }}</bdi>
                            </h4>
                            <span class="workspace-invite-access__counts">
                              {{
                                'members.invite.appCounts'
                                  | translate
                                    : {
                                        roles: selectedRoleCount(app),
                                        teams: selectedTeamCount(app),
                                      }
                              }}
                            </span>
                          </header>

                          <div class="workspace-invite-access__grid">
                            <div
                              class="workspace-invite-access__column"
                              role="group"
                              [attr.aria-labelledby]="'invite-roles-' + app.key"
                            >
                              <p
                                class="workspace-invite-access__label"
                                [id]="'invite-roles-' + app.key"
                              >
                                {{ 'members.roles' | translate }}
                                <span class="text-danger" aria-hidden="true">*</span>
                              </p>
                              @for (role of app.roles; track role.id) {
                                <label
                                  class="workspace-invite-choice"
                                  [class.workspace-invite-choice--checked]="isRoleSelected(role.id)"
                                  [class.workspace-invite-choice--disabled]="!canGrant(role)"
                                >
                                  <input
                                    type="checkbox"
                                    [checked]="isRoleSelected(role.id)"
                                    [disabled]="saving() || !canGrant(role)"
                                    [attr.aria-invalid]="errors().roles ? true : null"
                                    (change)="toggleRole(role)"
                                  />
                                  <span class="workspace-invite-choice__body">
                                    <span class="workspace-invite-choice__name">
                                      <span class="workspace-invite-choice__label">{{
                                        roleName(role)
                                      }}</span>
                                      @if (role.isOwnerRole) {
                                        <span
                                          class="workspace-invite-badge workspace-invite-badge--owner"
                                        >
                                          {{ 'roles.ownerRole' | translate }}
                                        </span>
                                      } @else if (role.isSystem) {
                                        <span class="workspace-invite-badge">
                                          {{ 'roles.systemRole' | translate }}
                                        </span>
                                      }
                                    </span>
                                    <span class="workspace-invite-choice__meta">
                                      <code dir="ltr">{{ role.code }}</code>
                                      @if (!canGrant(role)) {
                                        · {{ 'members.invite.roleNotGrantable' | translate }}
                                      }
                                    </span>
                                  </span>
                                </label>
                              } @empty {
                                <p class="m-0 text-[12px] text-text-muted">
                                  {{ 'members.invite.noRolesInApp' | translate: { app: app.label } }}
                                </p>
                              }

                              @for (role of selectedOwnerRoles(app); track role.id) {
                                <aside
                                  class="workspace-invite__warning"
                                  role="note"
                                >
                                  {{
                                    'members.invite.ownerWarning'
                                      | translate: { role: roleName(role), app: app.label }
                                  }}
                                </aside>
                              }
                            </div>

                            <div
                              class="workspace-invite-access__column"
                              role="group"
                              [attr.aria-labelledby]="'invite-teams-' + app.key"
                            >
                              <p
                                class="workspace-invite-access__label"
                                [id]="'invite-teams-' + app.key"
                              >
                                {{ 'members.teams' | translate }}
                                <span class="workspace-invite-access__optional">
                                  {{ 'members.invite.optional' | translate }}
                                </span>
                              </p>
                              @for (team of app.teams; track team.id) {
                                <label
                                  class="workspace-invite-choice"
                                  [class.workspace-invite-choice--checked]="isTeamSelected(team.id)"
                                  [style.padding-inline-start.rem]="0.55 + team.depth * 0.85"
                                >
                                  <input
                                    type="checkbox"
                                    [checked]="isTeamSelected(team.id)"
                                    [disabled]="saving()"
                                    (change)="toggleTeam(team)"
                                  />
                                  <span class="workspace-invite-choice__body">
                                    <span class="workspace-invite-choice__name">
                                      <span class="workspace-invite-choice__label">{{
                                        team.name
                                      }}</span>
                                    </span>
                                    @if (team.trail.length > 0) {
                                      <span class="workspace-invite-choice__meta">
                                        <bdi>{{ teamTrail(team) }}</bdi>
                                      </span>
                                    }
                                  </span>
                                </label>
                              } @empty {
                                <p class="m-0 text-[12px] text-text-muted">
                                  {{ 'members.invite.noTeamsInApp' | translate: { app: app.label } }}
                                </p>
                              }
                            </div>
                          </div>
                        </section>
                      }
                    }
                  </div>

                  @if (errors().roles; as message) {
                    <p class="m-0 mt-3 text-[12px] text-danger" id="invite-roles-error" role="alert">
                      {{ message | translate }}
                    </p>
                  } @else if (selectedApplications().length > 0) {
                    <p class="m-0 mt-3 text-[12px] leading-normal text-text-muted">
                      {{ 'members.invite.accessHint' | translate }}
                    </p>
                  }
                </section>
              }

              @case ('review') {
                <section class="mx-auto w-full max-w-lg" aria-labelledby="invite-review-heading">
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="invite-review-heading"
                    tabindex="-1"
                  >
                    {{ 'members.invite.reviewSection' | translate }}
                  </h3>
                  <p class="m-0 mb-4 text-[13px] leading-normal text-text-muted">
                    {{ 'members.invite.reviewLead' | translate }}
                  </p>

                  <div class="workspace-invite-review__person">
                    <div>
                      <p class="workspace-invite-review__kicker">{{ 'members.email' | translate }}</p>
                      <p class="workspace-invite-review__value">
                        <bdi class="ltr-text">{{ reviewEmail() }}</bdi>
                      </p>
                    </div>
                    <div>
                      <p class="workspace-invite-review__kicker">{{ 'members.invite.name' | translate }}</p>
                      <p class="workspace-invite-review__value workspace-invite-review__names">
                        @for (name of reviewNames(); track name.lang) {
                          <span [attr.lang]="name.lang" [attr.dir]="name.dir">{{ name.value }}</span>
                        }
                      </p>
                    </div>
                  </div>

                  <div class="workspace-invite-review__access">
                    @for (app of selectedApplications(); track app.key) {
                      <section class="workspace-invite-review__app" [attr.aria-label]="app.label">
                        <header class="workspace-invite-review__app-head">
                          <p class="workspace-invite-review__app-name">
                            <bdi>{{ app.label }}</bdi>
                          </p>
                          <span class="workspace-invite-access__counts">
                            {{
                              'members.invite.appCounts'
                                | translate
                                  : {
                                      roles: selectedRoleCount(app),
                                      teams: selectedTeamCount(app),
                                    }
                            }}
                          </span>
                        </header>

                        <div class="workspace-invite-review__cols">
                          <div>
                            <p class="workspace-invite-review__label">
                              {{ 'members.roles' | translate }}
                            </p>
                            <ul class="workspace-invite-review__list">
                              @for (role of selectedRolesOf(app); track role.id) {
                                <li
                                  class="workspace-invite-review__pill"
                                  [class.workspace-invite-review__pill--owner]="role.isOwnerRole"
                                >
                                  {{ roleName(role) }}
                                </li>
                              } @empty {
                                <li class="workspace-invite-review__pill workspace-invite-review__pill--empty">
                                  {{ 'members.noRoles' | translate }}
                                </li>
                              }
                            </ul>
                          </div>
                          <div>
                            <p class="workspace-invite-review__label">
                              {{ 'members.teams' | translate }}
                            </p>
                            <ul class="workspace-invite-review__list">
                              @for (team of selectedTeamsOf(app); track team.id) {
                                <li class="workspace-invite-review__pill workspace-invite-review__pill--team">
                                  <bdi>{{ teamPath(team) }}</bdi>
                                </li>
                              } @empty {
                                <li class="workspace-invite-review__pill workspace-invite-review__pill--empty">
                                  {{ 'members.noTeams' | translate }}
                                </li>
                              }
                            </ul>
                          </div>
                        </div>
                      </section>
                    }
                  </div>

                  @if (ownerRoleCount() > 0) {
                    <aside class="workspace-invite__warning mt-3" role="note">
                      {{
                        'members.invite.reviewOwner' | translate: { count: ownerRoleCount() }
                      }}
                    </aside>
                  }

                  <p class="m-0 mt-3 text-[12px] leading-normal text-text-muted">
                    {{ 'members.invite.emailNote' | translate }}
                  </p>
                </section>
              }
            }
          </div>

          <footer class="workspace-invite__footer">
            <span class="workspace-invite__summary" aria-live="polite">
              @if (step() === 'review') {
                {{
                  'members.invite.summary'
                    | translate
                      : {
                          apps: selectedApplications().length,
                          roles: requestRoleCount(),
                          teams: requestTeamCount(),
                        }
                }}
              } @else {
                {{
                  'members.invite.stepOf'
                    | translate: { current: stepIndex() + 1, total: stepItems.length }
                }}
              }
            </span>
            <div class="workspace-actions">
              <button
                type="button"
                class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="saving()"
                (click)="close()"
              >
                {{ 'members.inviteCancel' | translate }}
              </button>
              @if (stepIndex() > 0) {
                <button
                  type="button"
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving()"
                  (click)="goBack()"
                >
                  {{ 'members.invite.back' | translate }}
                </button>
              }
              @if (step() !== 'review') {
                <button
                  type="button"
                  class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving() || (step() === 'access' && grantScopeLoading())"
                  (click)="goNext()"
                >
                  {{ 'members.invite.next' | translate }}
                </button>
              } @else {
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
              }
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

  protected readonly step = signal<InviteStep>('identity');
  protected readonly stepItems = [
    { id: 'identity' as const, labelKey: 'members.invite.stepWho' },
    { id: 'access' as const, labelKey: 'members.invite.stepAccess' },
    { id: 'review' as const, labelKey: 'members.invite.stepReview' },
  ];
  protected readonly stepIndex = computed(() => STEPS.indexOf(this.step()));

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
    this.nameInvalid() ? 'invite-name-error' : 'invite-name-hint',
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

  protected goBack(): void {
    if (this.saving()) {
      return;
    }
    const index = this.stepIndex();
    if (index > 0) {
      this.step.set(STEPS[index - 1]);
      this.focusStepHeading();
    }
  }

  protected goNext(): void {
    if (this.saving()) {
      return;
    }
    if (this.step() === 'identity') {
      this.inviteForm.email().markAsTouched();
      this.inviteForm.arabicName().markAsTouched();
      this.inviteForm.englishName().markAsTouched();
      if (
        this.inviteForm.email().invalid() ||
        this.inviteForm.arabicName().invalid() ||
        this.inviteForm.englishName().invalid()
      ) {
        this.focusInvalid();
        return;
      }
      this.step.set('access');
      this.focusStepHeading();
      return;
    }

    if (this.step() === 'access') {
      this.inviteForm.applicationKeys().markAsTouched();
      this.inviteForm.roleIds().markAsTouched();
      if (this.inviteForm.applicationKeys().invalid() || this.inviteForm.roleIds().invalid()) {
        this.focusInvalid();
        return;
      }
      this.step.set('review');
      this.focusStepHeading();
    }
  }

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
    if (this.saving() || this.grantScopeLoading() || this.step() !== 'review') {
      return;
    }
    await submit(this.inviteForm, async () => {
      this.submitted.emit(this.model());
    });
    if (this.inviteForm().invalid()) {
      if (this.inviteForm.email().invalid() || this.inviteForm.arabicName().invalid()) {
        this.step.set('identity');
      } else {
        this.step.set('access');
      }
      this.focusInvalid();
    }
  }

  private focusStepHeading(): void {
    afterNextRender(
      () => {
        const heading = this.host.nativeElement.querySelector<HTMLElement>(
          '.workspace-invite__body h3',
        );
        heading?.focus({ preventScroll: false });
        heading?.scrollIntoView({ block: 'nearest' });
      },
      { injector: this.injector },
    );
  }

  private focusInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
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
