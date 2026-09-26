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
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  required,
  requiredError,
  submit,
  validate,
} from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { FocusTrap } from '../../../../shared/ui/focus-trap/focus-trap';
import { TeamNode } from '../../models/workspace-feature.model';

export type TeamFormMode = 'create' | 'edit';

export interface TeamFormRow {
  node: TeamNode;
  depth: number;
  parentId: string | null;
}

export interface TeamApplicationOption {
  key: string;
  label: string;
  /** The application team every other team of this application sits under. */
  rootTeamId: string;
}

/** What the page knows when it opens the dialog. */
export interface TeamFormSeed {
  mode: TeamFormMode;
  teamId: string | null;
  applicationKey: string | null;
  parentTeamId: string;
  name: string;
  /** Opened from a team ("Add sub-team") or editing: the application is inherited, not chosen. */
  applicationLocked: boolean;
}

export interface TeamFormResult {
  name: string;
  description: string | null;
  parentTeamId: string;
}

/** `ready` once the edited team's description is known; `error` keeps it out of the request. */
export type TeamDescriptionState = 'idle' | 'loading' | 'ready' | 'error';

interface TeamFormValue {
  applicationKey: string;
  parentTeamId: string;
  name: string;
  description: string;
}

interface FieldStatus {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { kind: string }[];
}

const NAME_MAX = 200;
const DESCRIPTION_MAX = 1000;

function notBlank(value: string) {
  return value.length > 0 && value.trim() === '' ? requiredError() : undefined;
}

@Component({
  selector: 'app-team-form-dialog',
  imports: [TranslatePipe, FormField, FocusTrap],
  template: `
    <div class="workspace-dialog workspace-dialog--fill" role="presentation">
      <button
        type="button"
        class="workspace-dialog__backdrop"
        tabindex="-1"
        [attr.aria-label]="'common.cancel' | translate"
        (click)="close()"
      ></button>
      <div
        class="workspace-dialog__panel workspace-team-details workspace-role-form workspace-team-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-form-title"
        aria-describedby="team-form-lead"
        appFocusTrap
        (dismiss)="close()"
      >
        <header class="workspace-team-details__head">
          <span class="workspace-form-dialog__badge" aria-hidden="true">
            @if (isEdit()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                <path d="m13.5 6.5 4 4" />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="9" cy="8" r="3" />
                <path d="M3.5 19c.9-3 3-4.5 5.5-4.5s4.6 1.5 5.5 4.5" />
                <path d="M18 8v6M15 11h6" stroke-linecap="round" />
              </svg>
            }
          </span>
          <div class="workspace-team-details__heading">
            <h2 class="workspace-dialog__title" id="team-form-title">
              {{ (isEdit() ? 'teams.editTitle' : 'teams.createTitle') | translate }}
            </h2>
            <p class="workspace-dialog__lead" id="team-form-lead">
              {{ (isEdit() ? 'teams.editLead' : 'teams.createLead') | translate }}
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
              aria-labelledby="team-form-details-heading"
            >
              <h3 class="workspace-form-dialog__step" id="team-form-details-heading">
                <span class="workspace-form-dialog__step-index" aria-hidden="true">1</span>
                {{ 'teams.form.detailsSection' | translate }}
              </h3>

              <div class="mb-3.5 flex flex-col gap-1">
                <div class="workspace-form-dialog__label-row">
                  <label class="text-[12px] font-semibold text-text-muted" for="team-form-name">
                    {{ 'teams.nameLabel' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </label>
                  <span
                    class="workspace-form-dialog__counter"
                    [class.workspace-form-dialog__counter--over]="nameLength() > nameMax"
                    aria-hidden="true"
                  >
                    {{ nameLength() }}/{{ nameMax }}
                  </span>
                </div>
                <div class="relative">
                  <input
                    id="team-form-name"
                    class="field-control"
                    [class.border-danger]="errors().name"
                    type="text"
                    autocomplete="off"
                    data-autofocus
                    [placeholder]="'teams.namePlaceholder' | translate"
                    [attr.aria-invalid]="errors().name ? true : null"
                    [attr.aria-describedby]="errors().name ? 'team-form-name-error' : null"
                    [formField]="teamForm.name"
                  />
                </div>
                @if (errors().name; as message) {
                  <p class="m-0 text-[12px] text-danger" id="team-form-name-error" role="alert">
                    {{ message | translate: { max: nameMax } }}
                  </p>
                }
              </div>

              <div class="mb-3.5 flex flex-col gap-1">
                <div class="workspace-form-dialog__label-row">
                  <label class="text-[12px] font-semibold text-text-muted" for="team-form-description">
                    {{ 'teams.descriptionLabel' | translate }}
                    <span class="workspace-role-form__optional">
                      {{ 'teams.form.optional' | translate }}
                    </span>
                  </label>
                  <span
                    class="workspace-form-dialog__counter"
                    [class.workspace-form-dialog__counter--over]="descriptionLength() > descriptionMax"
                    aria-hidden="true"
                  >
                    {{ descriptionLength() }}/{{ descriptionMax }}
                  </span>
                </div>
                <textarea
                  id="team-form-description"
                  class="field-control workspace-role-form__textarea"
                  [class.border-danger]="errors().description"
                  rows="3"
                  [placeholder]="
                    (descriptionState() === 'loading'
                      ? 'teams.form.descriptionLoading'
                      : 'teams.form.descriptionPlaceholder'
                    ) | translate
                  "
                  [attr.aria-busy]="descriptionState() === 'loading' ? true : null"
                  [attr.aria-invalid]="errors().description ? true : null"
                  [attr.aria-describedby]="
                    errors().description
                      ? 'team-form-description-error'
                      : descriptionState() === 'error'
                        ? 'team-form-description-hint'
                        : null
                  "
                  [formField]="teamForm.description"
                ></textarea>
                @if (errors().description; as message) {
                  <p class="m-0 text-[12px] text-danger" id="team-form-description-error" role="alert">
                    {{ message | translate: { max: descriptionMax } }}
                  </p>
                } @else if (descriptionState() === 'error') {
                  <p class="workspace-field-hint" id="team-form-description-hint">
                    {{ 'teams.form.descriptionUnavailable' | translate }}
                  </p>
                }
              </div>
            </section>

            <section
              class="workspace-team-details__section workspace-role-form__section"
              aria-labelledby="team-form-placement-heading"
            >
              <div>
                <h3 class="workspace-form-dialog__step" id="team-form-placement-heading">
                  <span class="workspace-form-dialog__step-index" aria-hidden="true">2</span>
                  {{ 'teams.form.placementSection' | translate }}
                </h3>
                <p class="workspace-team-details__section-lead">
                  {{ 'teams.form.placementLead' | translate }}
                </p>
              </div>

              @if (canPickApplication()) {
                <fieldset class="workspace-choice-group">
                  <legend class="text-[12px] font-semibold text-text-muted">
                    {{ 'teams.applicationLabel' | translate }}
                    <span class="text-danger" aria-hidden="true">*</span>
                  </legend>
                  <div class="workspace-choice-group__options">
                    @for (application of applications(); track application.key) {
                      <label
                        class="workspace-choice"
                        [class.workspace-choice--selected]="
                          model().applicationKey === application.key
                        "
                      >
                        <input
                          class="workspace-choice__input"
                          type="radio"
                          name="team-form-application"
                          [value]="application.key"
                          [checked]="model().applicationKey === application.key"
                          (change)="selectApplication(application)"
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
                  <p class="workspace-field-hint">{{ 'teams.form.applicationHint' | translate }}</p>
                </fieldset>
              } @else {
                <dl class="workspace-dl workspace-role-form__fixed">
                  <div class="workspace-dl__row">
                    <dt class="workspace-dl__label">{{ 'teams.applicationLabel' | translate }}</dt>
                    <dd class="workspace-dl__value">
                      <bdi>{{ applicationLabel() }}</bdi>
                    </dd>
                  </div>
                </dl>
              }

              <div class="mb-3.5 flex flex-col gap-1">
                <label class="text-[12px] font-semibold text-text-muted" for="team-form-parent">
                  {{ 'teams.parentLabel' | translate }}
                  <span class="text-danger" aria-hidden="true">*</span>
                </label>
                <div class="relative">
                  <select
                    id="team-form-parent"
                    class="field-control"
                    [class.border-danger]="errors().parentTeamId"
                    [attr.aria-invalid]="errors().parentTeamId ? true : null"
                    [attr.aria-describedby]="
                      errors().parentTeamId ? 'team-form-parent-error' : 'team-form-parent-hint'
                    "
                    [formField]="teamForm.parentTeamId"
                  >
                    <option value="" disabled>{{ 'teams.parentPlaceholder' | translate }}</option>
                    @for (option of parentOptions(); track option.node.id) {
                      <option [value]="option.node.id">
                        {{ indent(option.depth) }}{{ option.node.name }}
                      </option>
                    }
                  </select>
                </div>
                @if (errors().parentTeamId; as message) {
                  <p class="m-0 text-[12px] text-danger" id="team-form-parent-error" role="alert">
                    {{ message | translate }}
                  </p>
                } @else {
                  <p class="workspace-field-hint" id="team-form-parent-hint">
                    {{ 'teams.maxDepthHint' | translate: { max: maxDepth() } }}
                  </p>
                }
              </div>

              @if (path().length > 0) {
                <div class="workspace-team-form__preview">
                  <p class="workspace-team-form__preview-label" id="team-form-preview-label">
                    {{ 'teams.form.previewLabel' | translate }}
                  </p>
                  <ol class="workspace-team-form__path" aria-labelledby="team-form-preview-label">
                    @for (crumb of path(); track crumb.id) {
                      <li class="workspace-team-form__crumb">
                        <bdi>{{ crumb.name }}</bdi>
                      </li>
                    }
                    <li
                      class="workspace-team-form__crumb workspace-team-form__crumb--new"
                      aria-current="location"
                    >
                      <bdi>{{ previewName() || ('teams.form.previewPlaceholder' | translate) }}</bdi>
                    </li>
                  </ol>
                  <p class="workspace-team-form__level">
                    {{ 'teams.form.level' | translate: { level: level(), max: maxDepth() } }}
                  </p>
                </div>
              }
            </section>
          </div>

          <footer class="workspace-role-form__footer">
            <span class="workspace-role-form__summary">
              @if (!isEdit() && selectedParent(); as parent) {
                {{ 'teams.form.summary' | translate: { parent: parent.name } }}
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
                [disabled]="saving() || descriptionState() === 'loading' || descriptionBlocked()"
                [attr.aria-busy]="saving()"
              >
                @if (saving()) {
                  <span class="workspace-form-dialog__spinner" aria-hidden="true"></span>
                  {{ 'teams.saving' | translate }}
                } @else {
                  {{ (isEdit() ? 'teams.editSave' : 'teams.createSave') | translate }}
                }
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  `,
})
export class TeamFormDialog {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly seed = input.required<TeamFormSeed>();
  readonly rows = input<TeamFormRow[]>([]);
  readonly applications = input<TeamApplicationOption[]>([]);
  readonly maxDepth = input(6);
  /** The edited team's current description, fetched after the dialog opens. */
  readonly description = input<string | null>(null);
  readonly descriptionState = input<TeamDescriptionState>('idle');
  readonly saving = input(false);

  readonly closed = output<void>();
  readonly submitted = output<TeamFormResult>();

  protected readonly nameMax = NAME_MAX;
  protected readonly descriptionMax = DESCRIPTION_MAX;

  protected readonly isEdit = computed(() => this.seed().mode === 'edit');

  protected readonly model = linkedSignal<TeamFormSeed, TeamFormValue>({
    source: this.seed,
    computation: (seed) => ({
      applicationKey: seed.applicationKey ?? '',
      parentTeamId: seed.parentTeamId,
      name: seed.name,
      description: '',
    }),
  });

  protected readonly teamForm = form(this.model, (schema) => {
    required(schema.name);
    maxLength(schema.name, NAME_MAX);
    validate(schema.name, ({ value }) => notBlank(value()));
    maxLength(schema.description, DESCRIPTION_MAX);
    required(schema.parentTeamId);
  });

  protected readonly errors = computed(() => ({
    name: this.message(this.teamForm.name(), {
      required: 'teams.nameRequired',
      maxLength: 'teams.form.tooLong',
    }),
    description: this.message(this.teamForm.description(), {
      maxLength: 'teams.form.tooLong',
    }),
    parentTeamId: this.message(this.teamForm.parentTeamId(), {
      required: 'teams.form.parentRequired',
    }),
  }));

  protected readonly nameLength = computed(() => this.model().name.length);
  protected readonly descriptionLength = computed(() => this.model().description.length);
  /**
   * The update request always carries a description. If the current one could not be read,
   * saving untouched would wipe it — so saving waits until the user writes one themselves.
   */
  protected readonly descriptionBlocked = computed(
    () =>
      this.isEdit() &&
      this.descriptionState() === 'error' &&
      !this.teamForm.description().dirty(),
  );

  protected readonly previewName = computed(() => this.model().name.trim());

  protected readonly canPickApplication = computed(
    () => !this.seed().applicationLocked && this.applications().length > 1,
  );

  protected readonly applicationLabel = computed(() => {
    const key = this.model().applicationKey;
    return this.applications().find((option) => option.key === key)?.label ?? key;
  });

  /** A team cannot move under itself or one of its own sub-teams. */
  private readonly excludedIds = computed<ReadonlySet<string>>(() => {
    const teamId = this.seed().teamId;
    const ids = new Set<string>();
    if (!teamId) {
      return ids;
    }
    const collect = (node: TeamNode): void => {
      ids.add(node.id);
      node.children.forEach(collect);
    };
    const row = this.rows().find((entry) => entry.node.id === teamId);
    if (row) {
      collect(row.node);
    }
    return ids;
  });

  protected readonly parentOptions = computed<TeamFormRow[]>(() => {
    const applicationKey = this.model().applicationKey;
    const excluded = this.excludedIds();
    const max = this.maxDepth();
    return this.rows().filter(
      (row) =>
        row.node.applicationKey === applicationKey &&
        row.node.kind !== 'Organization' &&
        !excluded.has(row.node.id) &&
        row.depth + 1 < max,
    );
  });

  protected readonly selectedParent = computed<TeamNode | null>(() => {
    const id = this.model().parentTeamId;
    return this.rows().find((row) => row.node.id === id)?.node ?? null;
  });

  /** Organization › Application › … › parent — where the team will land. */
  protected readonly path = computed<TeamNode[]>(() => {
    const byId = new Map(this.rows().map((row) => [row.node.id, row]));
    const out: TeamNode[] = [];
    let cursor = byId.get(this.model().parentTeamId) ?? null;
    while (cursor) {
      out.unshift(cursor.node);
      cursor = cursor.parentId ? (byId.get(cursor.parentId) ?? null) : null;
    }
    return out;
  });

  /** 1-based level the team will occupy; the organization is level 1. */
  protected readonly level = computed(() => this.path().length + 1);

  constructor() {
    // The description arrives after the dialog opens; never overwrite what the user already typed.
    effect(() => {
      const description = this.description();
      if (this.descriptionState() !== 'ready') {
        return;
      }
      untracked(() => {
        if (!this.teamForm.description().dirty()) {
          this.model.update((value) => ({ ...value, description: description ?? '' }));
        }
      });
    });
  }

  protected selectApplication(application: TeamApplicationOption): void {
    if (this.model().applicationKey === application.key) {
      return;
    }
    this.model.update((value) => ({
      ...value,
      applicationKey: application.key,
      parentTeamId: application.rootTeamId,
    }));
  }

  protected indent(depth: number): string {
    return depth > 1 ? ' '.repeat((depth - 1) * 3) : '';
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || this.descriptionState() === 'loading' || this.descriptionBlocked()) {
      return;
    }
    await submit(this.teamForm, async () => {
      this.submitted.emit(this.result());
    });
    if (this.teamForm().invalid()) {
      afterNextRender(
        () =>
          this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
    }
  }

  private result(): TeamFormResult {
    const value = this.model();
    return {
      name: value.name.trim(),
      description: value.description.trim() || null,
      parentTeamId: value.parentTeamId,
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
