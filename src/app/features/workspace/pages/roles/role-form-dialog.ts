import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  hidden,
  maxLength,
  pattern,
  required,
  requiredError,
  submit,
  validate,
} from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import { PermissionCatalogItem, RoleListItem } from '../../models/workspace-feature.model';
import { RoleGrantScope, RolesService } from '../../services/roles.service';
import { RolePermissionTree } from './role-permission-tree';

export type RoleFormMode = 'create' | 'edit';

export interface RoleApplicationOption {
  key: string;
  label: string;
}

export interface RoleFormResult {
  applicationKey: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  permissionKeys: string[];
  metadataChanged: boolean;
  permissionsChanged: boolean;
}

interface RoleFormValue {
  applicationKey: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description: string;
  permissionKeys: string[];
}

interface FieldStatus {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { kind: string }[];
}

type RoleFormStep = 'details' | 'permissions' | 'review';

const STEPS: RoleFormStep[] = ['details', 'permissions', 'review'];
const ROLE_CODE_PATTERN = /^[\p{L}\p{Nd}_-]+$/u;
const NAME_MAX = 200;
const CODE_MAX = 100;
const DESCRIPTION_MAX = 1000;
const REVIEW_PERM_PREVIEW = 12;

function suggestCode(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, CODE_MAX);
}

function notBlank(value: string) {
  return value.length > 0 && value.trim() === '' ? requiredError() : undefined;
}

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  const a = new Set(left);
  const b = new Set(right);
  return a.size === b.size && [...a].every((key) => b.has(key));
}

@Component({
  selector: 'app-role-form-dialog',
  imports: [TranslatePipe, FormField, FocusTrap, RolePermissionTree],
  template: `
    <div class="workspace-dialog workspace-dialog--fill" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        [attr.aria-label]="'common.cancel' | translate"
        (click)="close()"
      ></button>
      <div
        class="workspace-dialog__panel workspace-team-details workspace-role-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-form-title"
        aria-describedby="role-form-lead"
        appFocusTrap
        (dismiss)="close()"
      >
        <header class="workspace-team-details__head">
          <div class="workspace-team-details__heading">
            <h2 class="workspace-dialog__title" id="role-form-title">
              {{ (isEdit() ? 'roles.form.editTitle' : 'roles.form.createTitle') | translate }}
            </h2>
            <p class="workspace-dialog__lead" id="role-form-lead">
              @if (isEdit()) {
                {{ 'roles.form.editLead' | translate: { name: roleName() } }}
              } @else {
                {{ 'roles.form.createLead' | translate }}
              }
            </p>
          </div>
          <button
            type="button"
            class="workspace-dialog__close"
            [attr.aria-label]="'common.cancel' | translate"
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
          [attr.aria-label]="'roles.form.stepsLabel' | translate"
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
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    class="size-3.5"
                  >
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

        <form class="workspace-role-form__form" (submit)="onSubmit($event)" novalidate>
          <div class="workspace-team-details__body workspace-role-form__body">
            @switch (step()) {
              @case ('details') {
                <section
                  class="mx-auto w-full max-w-2xl"
                  aria-labelledby="role-form-details-heading"
                >
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="role-form-details-heading"
                    tabindex="-1"
                  >
                    {{ 'roles.form.detailsSection' | translate }}
                  </h3>
                  <p class="m-0 mb-4 text-[13px] leading-normal text-text-muted">
                    {{ 'roles.form.detailsLead' | translate }}
                  </p>

                  @if (isEdit()) {
                    <dl class="workspace-invite-review__person mb-4">
                      <div>
                        <p class="workspace-invite-review__kicker">
                          {{ 'roles.details.application' | translate }}
                        </p>
                        <p class="workspace-invite-review__value">
                          <bdi>{{ applicationLabel() }}</bdi>
                        </p>
                      </div>
                      <div>
                        <p class="workspace-invite-review__kicker">
                          {{ 'roles.details.code' | translate }}
                        </p>
                        <p class="workspace-invite-review__value">
                          <code class="workspace-role-form__code-inline" dir="ltr">{{
                            role()?.code
                          }}</code>
                        </p>
                      </div>
                    </dl>
                    <p class="m-0 mb-4 text-[12px] leading-normal text-text-muted">
                      {{ 'roles.form.fixedHint' | translate }}
                    </p>
                  } @else {
                    <p class="m-0 mb-2 text-[12px] font-semibold text-text-muted" id="role-form-app-label">
                      {{ 'roles.form.application' | translate }}
                      <span class="text-danger" aria-hidden="true">*</span>
                    </p>
                    <div
                      class="workspace-invite-apps mb-4"
                      role="radiogroup"
                      aria-labelledby="role-form-app-label"
                    >
                      @for (application of applications(); track application.key) {
                        <label
                          class="workspace-invite-app"
                          [class.workspace-invite-app--selected]="
                            model().applicationKey === application.key
                          "
                        >
                          <input
                            type="radio"
                            class="workspace-invite-app__check"
                            name="role-form-application"
                            [value]="application.key"
                            [checked]="model().applicationKey === application.key"
                            [disabled]="saving()"
                            [attr.aria-invalid]="errors().applicationKey ? true : null"
                            (change)="selectApplication(application.key)"
                            (blur)="roleForm.applicationKey().markAsTouched()"
                          />
                          <span class="workspace-invite-app__body">
                            <span class="workspace-invite-app__name">
                              <bdi>{{ application.label }}</bdi>
                            </span>
                          </span>
                          @if (model().applicationKey === application.key) {
                            <span class="workspace-invite-app__tick" aria-hidden="true">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                              >
                                <path d="m5 12 5 5L19 7" />
                              </svg>
                            </span>
                          }
                        </label>
                      }
                    </div>
                    @if (errors().applicationKey; as message) {
                      <p class="m-0 mb-3 text-[12px] text-danger" role="alert">
                        {{ message | translate }}
                      </p>
                    } @else {
                      <p class="m-0 mb-4 text-[12px] leading-normal text-text-muted">
                        {{ 'roles.form.applicationHint' | translate }}
                      </p>
                    }
                  }

                  <div class="mb-3 grid grid-cols-2 gap-3 max-w480:grid-cols-1">
                    <div class="flex flex-col gap-1.5">
                      <label
                        class="text-[12px] font-semibold text-text-muted"
                        for="role-form-name-en"
                      >
                        {{ 'roles.form.nameEn' | translate }}
                        <span class="text-danger" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="role-form-name-en"
                        class="field-control"
                        [class.border-danger]="errors().nameEn"
                        type="text"
                        dir="ltr"
                        lang="en"
                        autocomplete="off"
                        data-autofocus
                        [placeholder]="'roles.form.nameEnPlaceholder' | translate"
                        [attr.aria-invalid]="errors().nameEn ? true : null"
                        [attr.aria-describedby]="errors().nameEn ? 'role-form-name-en-error' : null"
                        [formField]="roleForm.nameEn"
                      />
                      @if (errors().nameEn; as message) {
                        <p
                          class="m-0 text-[12px] text-danger"
                          id="role-form-name-en-error"
                          role="alert"
                        >
                          {{ message | translate: { max: nameMax } }}
                        </p>
                      }
                    </div>

                    <div class="flex flex-col gap-1.5">
                      <label
                        class="text-[12px] font-semibold text-text-muted"
                        for="role-form-name-ar"
                      >
                        {{ 'roles.form.nameAr' | translate }}
                        <span class="text-danger" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="role-form-name-ar"
                        class="field-control"
                        [class.border-danger]="errors().nameAr"
                        type="text"
                        dir="rtl"
                        lang="ar"
                        autocomplete="off"
                        [placeholder]="'roles.form.nameArPlaceholder' | translate"
                        [attr.aria-invalid]="errors().nameAr ? true : null"
                        [attr.aria-describedby]="errors().nameAr ? 'role-form-name-ar-error' : null"
                        [formField]="roleForm.nameAr"
                      />
                      @if (errors().nameAr; as message) {
                        <p
                          class="m-0 text-[12px] text-danger"
                          id="role-form-name-ar-error"
                          role="alert"
                        >
                          {{ message | translate: { max: nameMax } }}
                        </p>
                      }
                    </div>
                  </div>

                  @if (!isEdit()) {
                    <div class="mb-3 flex flex-col gap-1.5">
                      <label
                        class="text-[12px] font-semibold text-text-muted"
                        for="role-form-code"
                      >
                        {{ 'roles.form.code' | translate }}
                        <span class="text-danger" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="role-form-code"
                        class="field-control workspace-role-form__code"
                        [class.border-danger]="errors().code"
                        type="text"
                        dir="ltr"
                        autocomplete="off"
                        autocapitalize="characters"
                        spellcheck="false"
                        [placeholder]="'roles.form.codePlaceholder' | translate"
                        [attr.aria-invalid]="errors().code ? true : null"
                        [attr.aria-describedby]="
                          errors().code
                            ? 'role-form-code-error role-form-code-hint'
                            : 'role-form-code-hint'
                        "
                        [formField]="roleForm.code"
                        (input)="onCodeInput($event)"
                      />
                      @if (errors().code; as message) {
                        <p
                          class="m-0 text-[12px] text-danger"
                          id="role-form-code-error"
                          role="alert"
                        >
                          {{ message | translate: { max: codeMax } }}
                        </p>
                      }
                      <p class="m-0 text-[12px] leading-normal text-text-muted" id="role-form-code-hint">
                        {{ 'roles.form.codeHint' | translate }}
                      </p>
                    </div>
                  }

                  <div class="flex flex-col gap-1.5">
                    <label
                      class="text-[12px] font-semibold text-text-muted"
                      for="role-form-description"
                    >
                      {{ 'roles.form.description' | translate }}
                      <span class="workspace-role-form__optional">
                        {{ 'roles.form.optional' | translate }}
                      </span>
                    </label>
                    <textarea
                      id="role-form-description"
                      class="field-control workspace-role-form__textarea"
                      [class.border-danger]="errors().description"
                      rows="3"
                      [placeholder]="'roles.form.descriptionPlaceholder' | translate"
                      [attr.aria-invalid]="errors().description ? true : null"
                      [attr.aria-describedby]="
                        errors().description ? 'role-form-description-error' : null
                      "
                      [formField]="roleForm.description"
                    ></textarea>
                    @if (errors().description; as message) {
                      <p
                        class="m-0 text-[12px] text-danger"
                        id="role-form-description-error"
                        role="alert"
                      >
                        {{ message | translate: { max: descriptionMax } }}
                      </p>
                    }
                  </div>
                </section>
              }

              @case ('permissions') {
                <section aria-labelledby="role-form-permissions-heading">
                  <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h3
                        class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                        id="role-form-permissions-heading"
                        tabindex="-1"
                      >
                        {{ 'roles.form.permissionsSection' | translate }}
                      </h3>
                      <p class="m-0 text-[13px] leading-normal text-text-muted">
                        {{
                          'roles.form.permissionsLead'
                            | translate: { application: applicationLabel() }
                        }}
                      </p>
                    </div>
                    @if (model().applicationKey && !loading() && catalogAvailable()) {
                      <span class="workspace-invite-access__counts">
                        {{
                          'roles.form.selectedOf'
                            | translate: { count: selectedCount(), total: displayKeys().length }
                        }}
                      </span>
                    }
                  </div>

                  @if (!model().applicationKey) {
                    <p class="workspace-invite__empty" role="status">
                      {{ 'roles.form.permissionsChooseApp' | translate }}
                    </p>
                  } @else if (loading()) {
                    <div
                      class="workspace-loading workspace-loading--compact"
                      role="status"
                      aria-live="polite"
                    >
                      <span class="workspace-loading__spinner" aria-hidden="true"></span>
                      <span>{{ 'roles.form.permissionsLoading' | translate }}</span>
                    </div>
                  } @else if (!catalogAvailable()) {
                    <aside class="workspace-invite__warning" role="note">
                      {{ 'roles.form.permissionsUnavailable' | translate }}
                    </aside>
                  } @else {
                    @if (permissionsLocked()) {
                      <aside class="workspace-invite__warning mb-3" role="note">
                        {{ 'roles.form.permissionsLocked' | translate }}
                      </aside>
                    }
                    <app-role-permission-tree
                      idPrefix="role-form-perm"
                      [catalog]="catalog()"
                      [keys]="permissionsLocked() ? (role()?.permissionKeys ?? []) : displayKeys()"
                      [selected]="
                        permissionsLocked() ? (role()?.permissionKeys ?? []) : selectedKeys()
                      "
                      [grantable]="grantable()"
                      [offered]="offered()"
                      [editable]="!permissionsLocked()"
                      (selectedChange)="setPermissionKeys($event)"
                    />
                  }
                </section>
              }

              @case ('review') {
                <section class="mx-auto w-full max-w-2xl" aria-labelledby="role-form-review-heading">
                  <h3
                    class="m-0 mb-1 font-[family-name:var(--font-family)] text-[15px] font-bold text-text"
                    id="role-form-review-heading"
                    tabindex="-1"
                  >
                    {{ 'roles.form.reviewSection' | translate }}
                  </h3>
                  <p class="m-0 mb-4 text-[13px] leading-normal text-text-muted">
                    {{ 'roles.form.reviewLead' | translate }}
                  </p>

                  <div class="workspace-invite-review__person">
                    <div>
                      <p class="workspace-invite-review__kicker">
                        {{ 'roles.form.application' | translate }}
                      </p>
                      <p class="workspace-invite-review__value">
                        <bdi>{{ applicationLabel() }}</bdi>
                      </p>
                    </div>
                    <div>
                      <p class="workspace-invite-review__kicker">
                        {{ 'roles.form.code' | translate }}
                      </p>
                      <p class="workspace-invite-review__value">
                        <code class="workspace-role-form__code-inline" dir="ltr">{{
                          reviewCode()
                        }}</code>
                      </p>
                    </div>
                    <div>
                      <p class="workspace-invite-review__kicker">
                        {{ 'roles.form.nameEn' | translate }}
                      </p>
                      <p class="workspace-invite-review__value" lang="en" dir="ltr">
                        {{ model().nameEn.trim() }}
                      </p>
                    </div>
                    <div>
                      <p class="workspace-invite-review__kicker">
                        {{ 'roles.form.nameAr' | translate }}
                      </p>
                      <p class="workspace-invite-review__value" lang="ar" dir="rtl">
                        {{ model().nameAr.trim() }}
                      </p>
                    </div>
                  </div>

                  @if (model().description.trim()) {
                    <div class="workspace-invite-review__app mt-3">
                      <p class="workspace-invite-review__label">
                        {{ 'roles.form.description' | translate }}
                      </p>
                      <p class="m-0 text-[13px] leading-normal text-text">
                        {{ model().description.trim() }}
                      </p>
                    </div>
                  }

                  <div class="workspace-invite-review__app mt-3">
                    <header class="workspace-invite-review__app-head">
                      <p class="workspace-invite-review__app-name">
                        {{ 'roles.form.permissionsSection' | translate }}
                      </p>
                      <span class="workspace-invite-access__counts">
                        {{ 'roles.permissionCount' | translate: { count: reviewPermissionKeys().length } }}
                      </span>
                    </header>
                    <ul class="workspace-invite-review__list">
                      @for (item of reviewPermissionPreview(); track item.key) {
                        <li class="workspace-invite-review__pill">{{ item.label }}</li>
                      } @empty {
                        <li
                          class="workspace-invite-review__pill workspace-invite-review__pill--empty"
                        >
                          {{ 'roles.perm.none' | translate }}
                        </li>
                      }
                      @if (reviewPermissionMore() > 0) {
                        <li class="workspace-invite-review__pill workspace-invite-review__pill--team">
                          {{
                            'roles.form.reviewMorePerms'
                              | translate: { count: reviewPermissionMore() }
                          }}
                        </li>
                      }
                    </ul>
                  </div>
                </section>
              }
            }
          </div>

          <footer class="workspace-role-form__footer">
            <span class="workspace-role-form__summary" aria-live="polite">
              @if (step() === 'review') {
                {{ 'roles.permissionCount' | translate: { count: reviewPermissionKeys().length } }}
              } @else {
                {{
                  'roles.form.stepOf'
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
                {{ 'common.cancel' | translate }}
              </button>
              @if (stepIndex() > 0) {
                <button
                  type="button"
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-[1.468px] border-border-button bg-surface px-3.5 text-[13px] font-semibold text-text hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving()"
                  (click)="goBack()"
                >
                  {{ 'roles.form.back' | translate }}
                </button>
              }
              @if (step() !== 'review') {
                <button
                  type="button"
                  class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving() || (step() === 'permissions' && loading())"
                  (click)="goNext()"
                >
                  {{ 'roles.form.next' | translate }}
                </button>
              } @else {
                <button
                  type="submit"
                  class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="saving() || loading()"
                  [attr.aria-busy]="saving()"
                >
                  @if (saving()) {
                    {{ (isEdit() ? 'roles.form.saving' : 'roles.form.creating') | translate }}
                  } @else {
                    {{ (isEdit() ? 'roles.form.save' : 'roles.form.create') | translate }}
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
export class RoleFormDialog {
  private readonly rolesService = inject(RolesService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly language = inject(LanguageService);

  readonly mode = input.required<RoleFormMode>();
  readonly role = input<RoleListItem | null>(null);
  readonly applications = input<RoleApplicationOption[]>([]);
  readonly initialApplication = input('');
  readonly catalog = input<PermissionCatalogItem[]>([]);
  readonly catalogAvailable = input(true);
  readonly grantScope = input<RoleGrantScope | null>(null);
  readonly availableKeys = input<readonly string[] | null>(null);
  readonly loading = input(false);
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly submitted = output<RoleFormResult>();

  protected readonly nameMax = NAME_MAX;
  protected readonly codeMax = CODE_MAX;
  protected readonly descriptionMax = DESCRIPTION_MAX;

  protected readonly codeEdited = signal(false);
  protected readonly step = signal<RoleFormStep>('details');
  protected readonly stepItems = [
    { id: 'details' as const, labelKey: 'roles.form.stepDetails' },
    { id: 'permissions' as const, labelKey: 'roles.form.stepPermissions' },
    { id: 'review' as const, labelKey: 'roles.form.stepReview' },
  ];
  protected readonly stepIndex = computed(() => STEPS.indexOf(this.step()));
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  protected readonly model = linkedSignal<string | null, RoleFormValue>({
    source: () => this.role()?.id ?? null,
    computation: () =>
      untracked(() => {
        const role = this.role();
        if (role) {
          return {
            applicationKey: role.applicationKey,
            code: role.code,
            nameEn: role.nameEn,
            nameAr: role.nameAr,
            description: role.description ?? '',
            permissionKeys: [...role.permissionKeys],
          };
        }
        return {
          applicationKey: this.initialApplication(),
          code: '',
          nameEn: '',
          nameAr: '',
          description: '',
          permissionKeys: [],
        };
      }),
  });

  protected readonly roleForm = form(this.model, (schema) => {
    hidden(schema.applicationKey, { when: () => this.isEdit() });
    hidden(schema.code, { when: () => this.isEdit() });
    required(schema.applicationKey);
    required(schema.code);
    maxLength(schema.code, CODE_MAX);
    pattern(schema.code, ROLE_CODE_PATTERN);
    required(schema.nameEn);
    maxLength(schema.nameEn, NAME_MAX);
    validate(schema.nameEn, ({ value }) => notBlank(value()));
    required(schema.nameAr);
    maxLength(schema.nameAr, NAME_MAX);
    validate(schema.nameAr, ({ value }) => notBlank(value()));
    maxLength(schema.description, DESCRIPTION_MAX);
  });

  protected readonly errors = computed(() => ({
    applicationKey: this.message(this.roleForm.applicationKey(), {
      required: 'roles.form.applicationRequired',
    }),
    nameEn: this.message(this.roleForm.nameEn(), {
      required: 'roles.form.nameEnRequired',
      maxLength: 'roles.form.tooLong',
    }),
    nameAr: this.message(this.roleForm.nameAr(), {
      required: 'roles.form.nameArRequired',
      maxLength: 'roles.form.tooLong',
    }),
    code: this.message(this.roleForm.code(), {
      required: 'roles.form.codeRequired',
      maxLength: 'roles.form.tooLong',
      pattern: 'roles.form.codePattern',
    }),
    description: this.message(this.roleForm.description(), {
      maxLength: 'roles.form.tooLong',
    }),
  }));

  protected readonly roleName = computed(() => {
    const role = this.role();
    return role ? this.language.pick(role.nameAr, role.nameEn) : '';
  });

  protected readonly applicationLabel = computed(() => {
    const key = this.model().applicationKey;
    return this.applications().find((option) => option.key === key)?.label ?? key;
  });

  protected readonly offered = computed<ReadonlySet<string>>(() => {
    const applicationKey = this.model().applicationKey;
    if (!applicationKey) {
      return new Set();
    }
    const catalogOffer = this.rolesService.offeredKeys(this.catalog(), applicationKey);
    const available = this.availableKeys();
    if (!this.isEdit() || available === null) {
      return catalogOffer;
    }
    const known = new Set(this.catalog().map((item) => item.key));
    return new Set(available.filter((key) => catalogOffer.has(key) || !known.has(key)));
  });

  protected readonly grantable = computed<ReadonlySet<string>>(() => {
    const scope = this.grantScope();
    const applicationKey = this.model().applicationKey;
    if (!scope || !applicationKey) {
      return new Set();
    }
    return this.rolesService.grantableKeys(scope, applicationKey, this.offered());
  });

  protected readonly displayKeys = computed(() => [...this.offered()]);

  protected readonly selectedKeys = computed(() => {
    const visible = this.offered();
    return this.model().permissionKeys.filter((key) => visible.has(key));
  });

  protected readonly selectedCount = computed(() =>
    this.permissionsLocked()
      ? (this.role()?.permissionKeys.length ?? 0)
      : this.selectedKeys().length,
  );

  protected readonly permissionsLocked = computed(() => {
    const role = this.role();
    if (!this.isEdit() || !role) {
      return false;
    }
    const grantable = this.grantable();
    return role.permissionKeys.some((key) => !grantable.has(key));
  });

  protected readonly reviewCode = computed(() =>
    this.isEdit() ? (this.role()?.code ?? '') : this.model().code.trim().toUpperCase(),
  );

  protected readonly reviewPermissionKeys = computed(() =>
    this.permissionsLocked() ? [...(this.role()?.permissionKeys ?? [])] : this.selectedKeys(),
  );

  protected readonly reviewPermissionPreview = computed(() => {
    const byKey = new Map(
      this.catalog().map((item) => [item.key, this.language.pick(item.nameAr, item.nameEn)] as const),
    );
    return this.reviewPermissionKeys()
      .slice(0, REVIEW_PERM_PREVIEW)
      .map((key) => ({ key, label: byKey.get(key) || key }));
  });

  protected readonly reviewPermissionMore = computed(() =>
    Math.max(0, this.reviewPermissionKeys().length - REVIEW_PERM_PREVIEW),
  );

  constructor() {
    effect(() => {
      const name = this.roleForm.nameEn().value();
      if (this.isEdit() || this.codeEdited()) {
        return;
      }
      const code = suggestCode(name);
      untracked(() => {
        if (this.model().code !== code) {
          this.model.update((value) => ({ ...value, code }));
        }
      });
    });
  }

  /** Permissions belong to one application, so switching it starts the selection over. */
  protected selectApplication(applicationKey: string): void {
    if (this.model().applicationKey === applicationKey) {
      return;
    }
    this.model.update((value) => ({ ...value, applicationKey, permissionKeys: [] }));
    this.roleForm.applicationKey().markAsTouched();
  }

  protected onCodeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.codeEdited.set(value !== '');
  }

  protected setPermissionKeys(keys: readonly string[]): void {
    this.roleForm.permissionKeys().value.set([...keys]);
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

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
    if (this.step() === 'details') {
      if (!this.isEdit()) {
        this.roleForm.applicationKey().markAsTouched();
        this.roleForm.code().markAsTouched();
      }
      this.roleForm.nameEn().markAsTouched();
      this.roleForm.nameAr().markAsTouched();
      this.roleForm.description().markAsTouched();
      if (
        (!this.isEdit() &&
          (this.roleForm.applicationKey().invalid() || this.roleForm.code().invalid())) ||
        this.roleForm.nameEn().invalid() ||
        this.roleForm.nameAr().invalid() ||
        this.roleForm.description().invalid()
      ) {
        this.focusInvalid();
        return;
      }
      this.step.set('permissions');
      this.focusStepHeading();
      return;
    }

    if (this.step() === 'permissions') {
      if (this.loading()) {
        return;
      }
      this.step.set('review');
      this.focusStepHeading();
    }
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || this.loading() || this.step() !== 'review') {
      return;
    }
    await submit(this.roleForm, async () => {
      this.submitted.emit(this.result());
    });
    if (this.roleForm().invalid()) {
      if (
        this.roleForm.applicationKey().invalid() ||
        this.roleForm.code().invalid() ||
        this.roleForm.nameEn().invalid() ||
        this.roleForm.nameAr().invalid() ||
        this.roleForm.description().invalid()
      ) {
        this.step.set('details');
      } else {
        this.step.set('permissions');
      }
      this.focusInvalid();
    }
  }

  private result(): RoleFormResult {
    const value = this.model();
    const role = this.role();
    const nameEn = value.nameEn.trim();
    const nameAr = value.nameAr.trim();
    const description = value.description.trim() || null;
    const permissionKeys = this.permissionsLocked()
      ? [...(role?.permissionKeys ?? [])]
      : this.selectedKeys();

    return {
      applicationKey: value.applicationKey,
      code: value.code.trim().toUpperCase(),
      nameEn,
      nameAr,
      description,
      permissionKeys,
      metadataChanged:
        !role ||
        nameEn !== role.nameEn ||
        nameAr !== role.nameAr ||
        description !== (role.description?.trim() || null),
      permissionsChanged:
        !role ||
        (!this.permissionsLocked() &&
          this.catalogAvailable() &&
          !sameKeys(permissionKeys, role.permissionKeys)),
    };
  }

  private focusStepHeading(): void {
    afterNextRender(
      () => {
        const heading = this.host.nativeElement.querySelector<HTMLElement>(
          '.workspace-role-form__body h3',
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
