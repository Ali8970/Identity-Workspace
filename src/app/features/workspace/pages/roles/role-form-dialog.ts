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

const ROLE_CODE_PATTERN = /^[\p{L}\p{Nd}_-]+$/u;
const NAME_MAX = 200;
const CODE_MAX = 100;
const DESCRIPTION_MAX = 1000;

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
          <span class="workspace-form-dialog__badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
              @if (isEdit()) {
                <path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
              } @else {
                <path d="M12 9v6M9 12h6" stroke-linecap="round" />
              }
            </svg>
          </span>
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

        <form class="workspace-role-form__form" (submit)="onSubmit($event)" novalidate>
          <div class="workspace-team-details__body workspace-role-form__body">
            <section
              class="workspace-team-details__section workspace-role-form__section"
              aria-labelledby="role-form-details-heading"
            >
              <h3 class="workspace-form-dialog__step" id="role-form-details-heading">
                <span class="workspace-form-dialog__step-index" aria-hidden="true">1</span>
                {{ 'roles.form.detailsSection' | translate }}
              </h3>

              @if (isEdit()) {
                <dl class="workspace-dl workspace-role-form__fixed">
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">
                      {{ 'roles.details.application' | translate }}
                    </dt>
                    <dd class="workspace-dl__value">
                      <bdi>{{ applicationLabel() }}</bdi>
                    </dd>
                  </div>
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'roles.details.code' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      <code class="workspace-role-details__code" dir="ltr">{{ role()?.code }}</code>
                    </dd>
                  </div>
                </dl>
                <p class="workspace-field-hint">{{ 'roles.form.fixedHint' | translate }}</p>
              } @else {
                <fieldset
                  class="workspace-choice-group"
                  [attr.aria-describedby]="
                    errors().applicationKey
                      ? 'role-form-application-error'
                      : 'role-form-application-hint'
                  "
                >
                  <legend class="text-[12px] font-semibold text-text-muted">
                    {{ 'roles.form.application' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </legend>
                  <div class="workspace-choice-group__options">
                    @for (application of applications(); track application.key; let first = $first) {
                      <label
                        class="workspace-choice"
                        [class.workspace-choice--selected]="
                          model().applicationKey === application.key
                        "
                        [class.workspace-choice--invalid]="errors().applicationKey"
                      >
                        <input
                          class="workspace-choice__input"
                          type="radio"
                          name="role-form-application"
                          [value]="application.key"
                          [checked]="model().applicationKey === application.key"
                          [attr.aria-invalid]="first && errors().applicationKey ? true : null"
                          (change)="selectApplication(application.key)"
                          (blur)="roleForm.applicationKey().markAsTouched()"
                        />
                        <span class="workspace-choice__icon" aria-hidden="true">
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
                        <bdi class="workspace-choice__label">{{ application.label }}</bdi>
                        <span class="workspace-choice__check" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.25"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="m5 12 4.5 4.5L19 7" />
                          </svg>
                        </span>
                      </label>
                    }
                  </div>
                  @if (errors().applicationKey; as message) {
                    <p class="m-0 text-[12px] text-danger" id="role-form-application-error" role="alert">
                      {{ message | translate }}
                    </p>
                  } @else {
                    <p class="workspace-field-hint" id="role-form-application-hint">
                      {{ 'roles.form.applicationHint' | translate }}
                    </p>
                  }
                </fieldset>
              }

              <div class="workspace-form__row workspace-role-form__row">
                <div class="mb-3.5 flex flex-col gap-1">
                  <label class="text-[12px] font-semibold text-text-muted" for="role-form-name-en">
                    {{ 'roles.form.nameEn' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div class="relative">
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
                  </div>
                  @if (errors().nameEn; as message) {
                    <p class="m-0 text-[12px] text-danger" id="role-form-name-en-error" role="alert">
                      {{ message | translate: { max: nameMax } }}
                    </p>
                  }
                </div>

                <div class="mb-3.5 flex flex-col gap-1">
                  <label class="text-[12px] font-semibold text-text-muted" for="role-form-name-ar">
                    {{ 'roles.form.nameAr' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div class="relative">
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
                  </div>
                  @if (errors().nameAr; as message) {
                    <p class="m-0 text-[12px] text-danger" id="role-form-name-ar-error" role="alert">
                      {{ message | translate: { max: nameMax } }}
                    </p>
                  }
                </div>
              </div>

              @if (!isEdit()) {
                <div class="mb-3.5 flex flex-col gap-1">
                  <label class="text-[12px] font-semibold text-text-muted" for="role-form-code">
                    {{ 'roles.form.code' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div class="relative">
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
                        errors().code ? 'role-form-code-error role-form-code-hint' : 'role-form-code-hint'
                      "
                      [formField]="roleForm.code"
                      (input)="codeEdited.set($any($event.target).value.trim() !== '')"
                    />
                  </div>
                  @if (errors().code; as message) {
                    <p class="m-0 text-[12px] text-danger" id="role-form-code-error" role="alert">
                      {{ message | translate: { max: codeMax } }}
                    </p>
                  }
                  <p class="workspace-field-hint" id="role-form-code-hint">
                    {{ 'roles.form.codeHint' | translate }}
                  </p>
                </div>
              }

              <div class="mb-3.5 flex flex-col gap-1">
                <label class="text-[12px] font-semibold text-text-muted" for="role-form-description">
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
                  <p class="m-0 text-[12px] text-danger" id="role-form-description-error" role="alert">
                    {{ message | translate: { max: descriptionMax } }}
                  </p>
                }
              </div>
            </section>

            <section
              class="workspace-team-details__section workspace-role-form__section"
              aria-labelledby="role-form-permissions-heading"
            >
              <div>
                <div class="workspace-form-dialog__step-row">
                  <h3 class="workspace-form-dialog__step" id="role-form-permissions-heading">
                    <span class="workspace-form-dialog__step-index" aria-hidden="true">2</span>
                    {{ 'roles.form.permissionsSection' | translate }}
                  </h3>
                  @if (model().applicationKey && !loading() && catalogAvailable()) {
                    <span class="workspace-chip workspace-chip--muted">
                      {{
                        'roles.form.selectedOf'
                          | translate: { count: selectedCount(), total: displayKeys().length }
                      }}
                    </span>
                  }
                </div>
                @if (model().applicationKey) {
                  <p class="workspace-team-details__section-lead">
                    {{
                      'roles.form.permissionsLead' | translate: { application: applicationLabel() }
                    }}
                  </p>
                }
              </div>

              @if (!model().applicationKey) {
                <div class="workspace-team-details__empty" role="status">
                  <p class="workspace-panel__empty">
                    {{ 'roles.form.permissionsChooseApp' | translate }}
                  </p>
                </div>
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
                  <span>{{ 'roles.form.permissionsUnavailable' | translate }}</span>
                </aside>
              } @else {
                @if (permissionsLocked()) {
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
                    <span>{{ 'roles.form.permissionsLocked' | translate }}</span>
                  </aside>
                }
                <app-role-permission-tree
                  idPrefix="role-form-perm"
                  [catalog]="catalog()"
                  [keys]="permissionsLocked() ? (role()?.permissionKeys ?? []) : displayKeys()"
                  [selected]="permissionsLocked() ? (role()?.permissionKeys ?? []) : selectedKeys()"
                  [grantable]="grantable()"
                  [offered]="offered()"
                  [editable]="!permissionsLocked()"
                  (selectedChange)="setPermissionKeys($event)"
                />
              }
            </section>
          </div>

          <footer class="workspace-role-form__footer">
            <span class="workspace-role-form__summary" aria-live="polite">
              @if (model().applicationKey && !loading() && catalogAvailable()) {
                {{ 'roles.permissionCount' | translate: { count: selectedKeys().length } }}
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
              <button
                type="submit"
                class="btn-primary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="saving() || loading()"
                [attr.aria-busy]="saving()"
              >
                @if (saving()) {
                  <span class="workspace-form-dialog__spinner" aria-hidden="true"></span>
                  {{ (isEdit() ? 'roles.form.saving' : 'roles.form.creating') | translate }}
                } @else {
                  {{ (isEdit() ? 'roles.form.save' : 'roles.form.create') | translate }}
                }
              </button>
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
    this.permissionsLocked() ? (this.role()?.permissionKeys.length ?? 0) : this.selectedKeys().length,
  );

  protected readonly permissionsLocked = computed(() => {
    const role = this.role();
    if (!this.isEdit() || !role) {
      return false;
    }
    const grantable = this.grantable();
    return role.permissionKeys.some((key) => !grantable.has(key));
  });

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

  protected setPermissionKeys(keys: readonly string[]): void {
    this.roleForm.permissionKeys().value.set([...keys]);
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || this.loading()) {
      return;
    }
    await submit(this.roleForm, async () => {
      this.submitted.emit(this.result());
    });
    if (this.roleForm().invalid()) {
      afterNextRender(
        () =>
          this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
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
